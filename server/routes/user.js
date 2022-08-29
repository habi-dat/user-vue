const auth = require('../utils/auth');
const ldaphelper = require('../utils/ldaphelper');
const discoursehelper = require('../utils/discoursehelper');
const activation = require('../utils/activation');
const mailhelper = require('../utils/mailhelper');
const config = require('../config/config.json');
const express = require('express');
const Promise = require("bluebird");
const router = express.Router();

const validateUser = (user) => {
  var errors = [];
  if ('cn' in user) {
    if (!/^[A-Za-z0-9 ]{2,}[A-Za-z0-9]+$/.test(user.cn)) {
      errors.push('Anzeigename: mindestens 3 Zeichen, keine Sonderzeichen');
    }
  }

  if ('ou' in user) {
    if(!user.member.includes(user.ou)) {
      errors.push('Zugehörigkeit: keine Berechtigungen für ' + user.ou);
    }
  }

  if ('l' in user) {
    if (user.l == '') {
      errors.push('Ort: darf nicht leer sein');
    }
  }

  if ('preferredLanguage' in user) {
    if (!['de', 'en'].includes(user.preferredLanguage || 'de')) {
      errors.push('Sprache: erlaubte Werte: [de, en]')
    }
  }

  return Promise.resolve()
    .then(() => {
      if (errors.length > 0) {
        throw {status: 400, message: errors.join("\n")};
      } else {
        return user;
      }
    })
}

const validateEmail = (mail, dn = undefined) => {
  if (!mail) {
    return Promise.reject({status: 400, message: 'Keine E-Mailadresse angegeben'})
  } else {
    return ldaphelper.getByEmail(mail)
      .then(users => {
        if (dn) {
          users = users.filter(user => {return user.dn !== dn});
        }
        if (users.length > 0) {
          throw {status: 400, message: 'Benutzer*in mit E-Mailadresse ' + mail + ' existiert bereits: ' + users.map(user => {return user.cn}).join(', ')};
        } else {
          return;
        }
      })
  }
}

router.post('/api/user/profile', auth.isLoggedIn, function(req, res, next) {
    var user = {
        dn: req.user.dn,
        cn: req.body.cn,
        ou: req.body.ou,
        l: req.body.l,
        preferredLanguage: req.body.preferredLanguage,
    };

    return ldaphelper.populateUserGroups(user)
      .then(validateUser)
      .then(user => ldaphelper.updateUser(user))
      .then(discoursehelper.syncUser)
      .then(user => res.send({user: user}))
      .catch(error => next);
    }
);

// INVITE VALIDATIONS

const isAuthorizedForInvite = function(tokenId, user) {
  return activation.getToken(tokenId)
    .then(token => {
      if (!user.isAdmin) {
        // if token is by other user check if token groups are within users admin groups
        if (token.currentUser && token.currentUser.dn !== user.dn && token.data.member) {
          var notAuthorizedGroups = [];
          [].concat(token.data.owner).concat(token.data.member).forEach(group => {
            if (!user.ownedGroups.includes(group)) {
              notAuthorizedGroups.push(group);
            }
          })
          if (notAuthorizedGroups.length > 0) {
            throw {status: 400, message: 'Keine Berechtigungen für die Einladung an ' + token.data.mail + '. Du hast nur Berechtigungen für Einladungen zu deinen Gruppen'}
          }
        }
      } else {
        return token;
      }
    })
}

// GET INVITES

router.get("/api/user/invites", auth.isLoggedInGroupAdmin, function(req, res, next) {
  Promise.join(activation.getInvites(), ldaphelper.fetchGroups(req.user.owner),
    (invites, groups) => {
      if (req.user.isGroupAdmin && !req.user.isAdmin) {
        invites = invites.filter(invite => {
          return invite.currentUser && invite.currentUser.dn === req.user.dn
          || invite.data.owner.some(ownr => req.user.ownedGroups.includes(ownr))
          || invite.data.member.some(membr => req.user.memberGroups.includes(ldaphelper.dnToCn(membr)));
          ;
        })
      }
      return res.send({invites: invites})
    })
  .catch(next);
})

// SEND INVITE

router.post('/api/user/invite', auth.isLoggedInGroupAdmin, function(req, res, next) {
    var groups = [];
    return validateEmail(req.body.email)
      .then(() => {
        // filter duplicates
        groups = [...new Set(req.body.groups)];
        // when user is group admin check if he/she is group admin of all given groups
        if (!req.user.isAdmin) {
          groups.forEach(group => {
            if (!req.body.ownedGroups.includes(group)) {
              throw {status: 400, message: 'Keine Berechtigungen für Gruppe ' + group};
            }
          })
        }
        return;
      })
      .then(() => {
        // refresh or create token and send email
        return activation.getTokenByData(req.body.email.toLowerCase(), 'mail', 'invite')
          .then(token => {
            if (token) {
              throw {status: 400, message: 'Eine Einladung an ' + req.body.email + ' wurde bereits von ' + token.currentUser.cn + ' versendet'};
            } else {
              return activation.createAndSaveToken(req.user, {mail: req.body.email.toLowerCase(), owner: [], member: groups}, 7*24, 'invite');
            }
          })
          .then(token => mailhelper.sendMail(req, res, req.body.email, 'invite', { inviteLink: config.settings.activation.base_url+ '/user/invite/accept/' + token.token }))
      })
      .then(() => {
        res.send({ success: true})
      })
      .catch(next)
    }
);

// DELETE INVITATION
router.delete('/api/user/invites', auth.isLoggedInGroupAdmin, function(req, res, next) {
  return Promise.map(req.body.tokens, token => isAuthorizedForInvite(token, req.user))
    .then(() => {
      return Promise.map(req.body.tokens, token => activation.deleteToken(token))
        .then(() => res.send({success:true}))
    })
    .catch(next)

});

// REFRESH INVITATION
router.put('/api/user/invites/repeat', auth.isLoggedInGroupAdmin, function(req, res, next) {
  return Promise.map(req.body.tokens, token => isAuthorizedForInvite(token, req.user))
    .then(() => {
      return Promise.map(req.body.tokens, token => {
        return  activation.refreshToken(req.user, token, 7*24)
          .then(token => mailhelper.sendMail(req, res, token.data.mail,'invite', { inviteLink: config.settings.activation.base_url+ '/user/invite/accept/' + token.token}))
      })
      .then(updatedData => {
        res.send({invites: updatedData})
      })
    })
    .catch(next);
});

// GET USERS

router.get('/api/users', auth.isLoggedInGroupAdmin, function(req, res, next) {
  return ldaphelper.fetchUsersWithGroups()
    .then(users => {
      res.send({users: users})
    })
    .catch(next);
})

// ENDPOINTS TO CHECK USER NAME AND EMAIL AVAILABILITY

router.get('/api/user/available/cn/:cn/:token', function(req, res, next) {
    activation.isTokenValid(req.params.token)
        .then(token => ldaphelper.getByCN(req.params.cn))
        .then(user => {
            if (user) {
                res.send({available: false});
            } else {
                res.send({available: true});
            }
        })
        .catch(next);
});

router.get('/api/user/available/cn/:cn', auth.isLoggedIn, function(req, res, next) {
    ldaphelper.getByCN(req.params.cn)
        .then(user => {
            if (user) {
                res.send({available: false});
            } else {
                res.send({available: true});
            }
        })
        .catch(next);
});

router.get('/api/user/available/uid/:uid', auth.isLoggedInGroupAdmin, function(req, res, next) {
    ldaphelper.getByUID(req.params.uid)
        .then(user => {
            if (user) {
                res.send({available: false});
            } else {
                res.send({available: true});
            }
        })
        .catch(next);
});

router.get('/api/user/available/uid/:uid/:token', function(req, res, next) {
    activation.isTokenValid(req.params.token)
        .then(token => ldaphelper.getByUID(req.params.uid))
        .then(user => {
            if (user) {
                res.send({available: false});
            } else {
                res.send({available: true});
            }
        })
        .catch(next);
});

router.get('/api/user/available/mail/:mail', auth.isLoggedInGroupAdmin, function(req, res, next) {
    ldaphelper.getByEmail(req.params.mail)
        .then(user => {
            if (user && user.length > 0) {
                res.send({available: false});
            } else {
                res.send({available: true});
            }
        })
        .catch(next);
});

router.get('/api/user/available/mail/:mail/:token', function(req, res, next) {
    activation.isTokenValid(req.params.token)
        .then(token => ldaphelper.getByEmail(req.params.mail))
        .then(user => {
            if (user && user.length > 0) {
                res.send({available: false});
            } else {
                res.send({available: true});
            }
        })
        .catch(next);
});


module.exports = router;

