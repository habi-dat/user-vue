const auth = require('../utils/auth');
const config    = require('../config/config.json');
const passport = require('passport');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const routing = require('../utils/routing');
const activation = require('../utils/activation');
const ldaphelper = require('../utils/ldaphelper');
const mail = require('../utils/mailhelper');
const Promise = require("bluebird");
//var actions = require('../actions');


router.get("/api/user", auth.isLoggedIn, (req, res) => {

    res.send({ user: {name: 'Florian'} })
})

router.get("/api/config",  (req, res) => {
  res.send({
      config: {
          saml: config.saml.enabled,
          title: config.settings.general.title,
          authenticated: req.isAuthenticated()
      },
      user: req.user
  })
})

router.get('/api/ping', (req, res, next) => {
  res.send('pong');
})

// LOGIN / LOGOUT ROUTES

if (config.saml.enabled) {
    router.get("/saml/login",
      passport.authenticate('saml',{session: true, failureRedirect: '/login', failureFlash:true, successReturnToOrRedirect: '/'})
    );

    router.get("/api/logout", function(req, res) {
      global.samlStrategy.logout(req, (err, request) => {
        if (err) {
            res.status(500).send('Logout fehlgeschlagen');
        } else {
            console.log("Ausgeloggt")
            res.redirect(request);
        }
      });
    });

    router.post('/saml/consume',
        bodyParser.urlencoded({ extended: false }),
        passport.authenticate('saml', {session: true, failureRedirect: '/login', failureFlash:true, successReturnToOrRedirect: '/'})
    );

    router.get('/saml/consume',
        passport.authenticate('saml', {session: true, failureRedirect: '/login', failureFlash:true, successReturnToOrRedirect: '/'}),
        (req,res) => {
          res.redirect('/');
        }
    );

} else {

    router.post("/api/login", (req, res, next) => {
      passport.authenticate("ldapauth", (err, user, info) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.status(400).send([user, "Login fehlgeschlagen", info]);
        }

        req.login(user, err => {
          ldaphelper.populateUserGroups(user)
            .then(user => {
              res.send({user: user});
            })
            .catch(error => {
              next(error);
            })
        });
      })(req, res, next);
    });

    router.get('/api/logout', (req, res) => {
        req.logout((err) => {
            if (err) {
                res.status(500).send('Logout fehlgeschlagen');
            } else {
                console.log("Ausgeloggt")
                res.send("Ausgeloggt");
            }
        });
    });

}

// LOST PASSWORD ROUTES
/*
router.get('/lostpasswd', function(req, res) {
    routing.render(req, res, 'user/lostpasswd', 'Passwort Vergessen');
});

router.get('/passwd/:uid/:token', function(req, res) {
    activation.isTokenValid(req.params.token)
        .then(token => {
            return ldaphelper.getByUID(req.params.uid)
                .then(user => routing.render(req, res, 'user/passwd', 'Passwort Ändern', {user: user, token: req.params.token}));
        })
        .catch(error => routing.errorPage(req,res,error));
});

router.post('/user/passwd', function(req, res) {
    var user = {
                    cn: false,
                    l: false,
                    ou: false,
                    mail: false,
                    description: false,
                    changedUid: false,
                    password: req.body.password,
                    passwordRepeat: req.body.passwordRepeat,
                    language: false,
                    member: false,
                    owner: false
                };
    activation.isTokenValid(req.body.token)
        .then(token => {
            user.dn = token.data.dn;
            user.uid = token.data.uid;
            return actions.user.modify(user, { ownedGroups : []})
                .then(response => {
                    if (response.status) {
                        return activation.deleteToken(req.body.token)
                            .then(() => {return response;});
                    } else {
                        return response;
                    }
                })
                .then(response => routing.checkResponseAndRedirect(req, res, response, 'Passwort geändert', 'Fehler beim Ändern des Passworts', '/redirect', '/passwd/' + req.body.uid + '/' + req.body.token));
            })
        .catch(error => routing.errorPage(req, res, 'Fehler beim Ändern des Passworts: ' + error));
});

router.post('/user/lostpasswd', function(req, res) {
    ldaphelper.getByEmail(req.body.mail)
        .then(users => {
            if (users.length == 0) {
                throw "Kein*e Benutzer*in mit dieser E-Mail Adresse gefunden";
            } else if (users.length > 1) {
                throw "Mehrere Benutzer*innen mit dieser E-Mail Adresse gefunden";
            }
            return mail.sendPasswordResetEmail(req, res, users[0])
                .then(info =>  routing.successRedirect(req, res, 'Link zum Ändern des Passworts wurde per E-Mail verschickt', '/lostpasswd'))
                .catch(error => routing.errorRedirect(req, res, 'Link zum Ändern des Passworts konnte nicht verschickt werden: ' + error, '/lostpasswd'));
        })
        .catch(error => routing.errorRedirect(req, res, 'E-Mailadresse nicht gefunden: ' + error, '/lostpasswd'));
});*/


module.exports = router;
