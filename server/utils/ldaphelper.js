const ldap = require('ldapjs');
const ssha = require('openldap_ssha');
const config    = require('../config/config.json').ldap;
const discourse = require('./discoursehelper');
const mail = require('./mailhelper');
const zxcvbn = require('./zxcvbn');
const Promise = require("bluebird");

var client = ldap.createClient({
  url: config.server.url
});
client.bind(config.server.bindDn, config.server.bindCredentials, function(err) {
    if (err) {
        console.log('Error connecting LDAP: ' + err);
    }
});

exports.fetchObject = function(dn) {
    return new Promise((resolve, reject) => {

        var opts = {
        };

        var entries = [];

        client.search(dn, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                resolve(entry.object)
            });
            res.on('error', function(err) {
                reject('Error fetching object ' + dn + ': ' + err.message);
            });
            res.on('end', function(result) {
                reject('LDAP object not found: ' + dn);
            });
        });
    });
};

exports.fetchUser = function(dn) {
    return exports.fetchObject(dn)
        .then((user) => {
            return exports.populateUserGroups(user);
        })
};

exports.populateParentGroups = function(user, groups) {
    return new Promise((resolve, reject) => {
        var filter = '(|';
        groups.forEach(group => {
            filter += '(member=' + group + ')';
        })
        filter += ')';
        var opts = {
            scope: 'sub',
            filter: filter
        };


        var entries = [], newParentGroups = [];

        client.search('ou=groups,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                entries.push(entry.object);
            });
            res.on('error', function(err) {
                reject('Error populating parent groups: ' + err.message);
            });
            res.on('end', function(result) {
                entries.forEach((group) => {
                    if (!user.member.includes(group.dn)) {
                        user.member.push(group.dn);
                        user.memberGroups.push(group.dn);
                        newParentGroups.push(group.dn);
                    }
                });
                if (newParentGroups.length > 0) {
                    resolve(exports.populateParentGroups(user, newParentGroups));
                } else {
                    console.log('user: ', user);
                    resolve(user);
                }
            });
        });
    })
}

exports.populateUserGroups = function(user) {

    return new Promise((resolve, reject) => {


        var opts = {
            scope: 'sub',
            filter: '(|(owner=' + user.dn + ')(member=' + user.dn + '))'
        };

        var entries = [];

        client.search('ou=groups,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                //console.log('groupentry: '+ JSON.stringify(entry.object));
                //console.log(JSON.stringify(entry.object.member));
                entries.push(entry.object);
            });
            res.on('error', function(err) {
                reject('Error populating user groups: ' + err.message);
            });
            res.on('end', function(result) {
                user.member = [];
                user.memberGroups = [];
                user.owner = [];
                user.ownerGroups = [];
                entries.forEach(group => {
                    if (group.owner && group.owner.includes(user.dn)) {
                        user.owner.push(group.dn);
                        user.ownerGroups.push(group);
                    }
                    if (group.member && group.member.includes(user.dn)) {
                        user.member.push(group.dn);
                        user.memberGroups.push(group);
                    }
                });
                if (user.member.includes('cn=admin,ou=groups,' + config.server.base)) {
                  user.isAdmin = true;
                  user.isGroupAdmin = true;
                } else if (user.owner.length > 0) {
                  user.isGroupAdmin = true;
                }
                resolve(exports.populateParentGroups(user, user.member));
            });
        });
    });
};

exports.fetchUsers = function() {
    return new Promise((resolve, reject) => {

        var opts = {
            scope: 'sub'
        };

        var entries = [];

        client.search('ou=users,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
              if (entry.object.cn) {
                entries.push(entry.object);
              }
            });
            res.on('error', function(err) {
                reject('Error fetching users: ' + err.message);
            });
            res.on('end', function(result) {
              entries.filterByDns = function(userDns, inverse = false)  {
                return this.filter(user => {
                  if (inverse) {
                    return !userDns.includes(user.dn)
                  } else {
                     return userDns.includes(user.dn)
                  }
                })
              }
              entries.findByDn = function(dn)  {
                return this.find(user => {
                  return user.dn === dn;
                })
              }
              resolve(entries);
            });
        });
    });
};

exports.fetchUsersWithGroups = function() {
  return exports.fetchGroups('all')
    .then(groups => {
      return exports.fetchUsers()
        .then(users => {
          users.forEach(user => {
            user.member = [];
            user.owner = [];
            user.memberGroups = [];
            user.ownerGroups = [];
          })
          // populate Groups
          groups.forEach(group => {
            group.member.forEach(member => {
              var user = users.findByDn(member)
              if (user) {
                user.member.push(group.dn)
                user.memberGroups.push(group)
              }
            })
            group.owner.forEach(owner => {
              var user = users.findByDn(owner)
              if (user) {
                user.owner.push(group.dn)
                user.ownerGroups.push(group)
              }
            })
          })
          return users;
        })
    })
}


exports.change = function (dn, operation, modification) {
    return new Promise((resolve, reject) => {
        var change = new ldap.Change( {
            operation: operation,
            modification: modification
        });

        client.modify(dn, change, function(err ) {
            if (err) {
                reject(err);
            } else  {
                resolve();
            }
        });
    });
};

exports.updateDN = function(oldDN, newDN) {
    return new Promise((resolve, reject) => {
        client.modifyDN(oldDN, newDN, function(err) {
            if (err) {
                reject(err);
            } else{
                resolve();
            }
        })
    });
}

exports.updateUser = function(user) {
  var steps = [];
  return exports.fetchUser(user.dn)
    .then(oldUser => {
      if ('newDN' in user && oldUser.dn !== user.dn || 'cn' in user && oldUser.cn !== user.cn) {
        var oldDN = user.dn;
        user.dn = user.newDN || 'cn=' + user.cn + ',ou=users,' + config.server.base;
        return exports.updateDN(oldDN, user.dn)
          .then(() => { return oldUser; });
      }
      else {
        return oldUser;
      }
    })
    .then(oldUser => {
      if ('ou' in user) {
        return exports.groupDnToCn(user.ou)
          .then(title => {
            user.title = title;
            return oldUser;
          })
      } else {
        return oldUser;
      }
    })
    .then(oldUser => {
      var fields = Object.keys(user).filter(key => {
        return ['cn', 'ou', 'title', 'l', 'preferredLanguage', 'description'].includes(key);
      })
      return Promise.map(fields, field => {
        var modification = {}
        modification[field] = user[field];
        console.log('mod: ', modification);
        return exports.change(user.dn, 'replace', modification)
      })
    })
    .then(() => {
      return exports.fetchUser(user.dn);
    })
}



exports.groupDnToO = function(dn) {
    return exports.fetchObject(dn)
        .then(group => { return group.o; })
        .catch(error => { return; })
}

exports.groupDnToCn = function(dn) {
    return exports.fetchObject(dn)
        .then(group => { return group.cn; })
        .catch(error => { return; })
}

var findGroup = function(dn) {
  return function(group) {
    return group.dn === dn;
  }
}

exports.fetchGroups = function(ownedGroups, noAdminGroups = false) {

    return new Promise((resolve, reject) => {


        var opts = {
            scope: 'sub'
        };

        var entries = [];

        client.search('ou=groups,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                if ((!noAdminGroups || entry.object.cn !== 'admin') && ownedGroups && (ownedGroups == 'all' || ownedGroups.includes(entry.object.dn))) {
                    entries.push(entry.object);
                }
            });
            res.on('error', function(err) {
                reject('Error fetching groups: ' + err.message);
            });
            res.on('end', function(result) {
                entries.sort(function(a, b){
                    if (a.cn) {
                        return a.cn.localeCompare(b.cn);
                    }
                    return 0;
                });
                resolve(entries.map(group => {
                    group.member = exports.ldapAttributeToArray(group.member);
                    group.owner = exports.ldapAttributeToArray(group.owner);
                    group.parentGroups = [];
                    return group;
                }));
            });
        });

    });
};

exports.isGroup = function(dn) {
    return dn.endsWith('ou=groups,' + config.server.base);
}

exports.filterSubgroups = function(member) {
    return member.filter(dn => {
        return exports.isGroup(dn);
    })
}

var populateSubGroups = function(parents, groups, group, originalGroup, depth) {
  var newParents = parents.join('@@').split('@@');
  newParents.push(group.dn);
  exports.filterSubgroups(group.member).forEach(dn => {
    var subGroup = groups.find(findGroup(dn));
    if (subGroup) {
      var subGroupCopy = {
        dn: subGroup.dn,
        cn: subGroup.cn,
        o: subGroup.o,
        description: subGroup.description,
        owner: subGroup.owner,
        member: subGroup.member,
        subGroups: []
      }
      group.subGroups.push(subGroupCopy)

      if (!parents.includes(subGroup.dn)) {
        subGroup.isRoot = false;
        if (depth < 5 && subGroup.dn) {
          populateSubGroups(newParents, groups, subGroupCopy, subGroup, depth + 1)
        }
      } else {
        originalGroup.isRoot = true;
      }
    }
  });
}

exports.fetchGroupTree = function() {
  return exports.fetchGroups('all')
    .then(groups => {
      groups.forEach(group => {
        if (group.isRoot === undefined) {
          group.isRoot = true;
        }
        group.subGroups = []
        populateSubGroups([], groups, group, group, 0);
      })
      var onlyRoot =  groups.filter(group => {
        return group.isRoot && group.cn;
      })
      return onlyRoot;
    })
}

exports.fetchOwnedGroups = function(currentUser) {
    return new Promise((resolve, reject) => {

        var opts = {
            scope: 'sub'
        };

        var owner = [];
        var member = [];

        client.search('ou=groups,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                //console.log('groupentry: '+ JSON.stringify(entry.object));
                //console.log(JSON.stringify(entry.object.member));
                if (currentUser.isAdmin || (entry.object.owner && entry.object.owner.indexOf(currentUser.dn) > -1)) {
                    owner.push(entry.object);
                }
                if (entry.object.member && entry.object.member.indexOf(currentUser.dn) > -1) {
                    member.push(entry.object);
                }
            });
            res.on('error', function(err) {
                reject('Error fetching users owned groups: ' + err.message);
            });
            res.on('end', function(result) {
                resolve({owner: owner, member: member});
            });
        });
    });
};

exports.getByEmail = function(mail) {
    return new Promise((resolve, reject) => {

        var opts = {
          filter: '(mail=' + mail + '*)',
          scope: 'sub'
        };

        var entries = [];

        client.search('ou=users,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                if (entry.object.cn && entry.object.mail && entry.object.mail.toLowerCase() === mail.toLowerCase())
                    entries.push(entry.object)

            });
            res.on('error', function(err) {
                reject('Error fetching by e-mail: ' + err.message);
            });
            res.on('end', function(result) {
                resolve(entries);
            });
        });
    });
};

exports.getByUID = function(uid) {
    return new Promise((resolve, reject) => {

        var opts = {
          filter: '(uid=' + uid + ')',
          scope: 'sub'
        };

        var entries = [];

        client.search('ou=users,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                entries.push(entry.object)
            });
            res.on('error', function(err) {
                reject('Error fetching user by UID ' + uid + ': ' + err.message);
            });
            res.on('end', function(result) {
                if (entries.length == 0) {
                    resolve(null);
                } else if (entries.length > 1) {+
                    reject("Mehrere Benutzer*innen mit UID " + uid + " gefunden");
                } else {
                    resolve(entries[0]);
                }
            });
        });
    });
};

exports.getByCN = function(cn) {
    return new Promise((resolve, reject) => {

        var opts = {
          filter: '(cn=' + cn + ')',
          scope: 'sub'
        };

        var entries = [];

        client.search('ou=users,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                entries.push(entry.object)
            });
            res.on('error', function(err) {
                reject('Error fetching user by CN ' + cn + ': ' + err.message);
            });
            res.on('end', function(result) {
                if (entries.length == 0) {
                    resolve(null);
                } else if (entries.length > 1) {+
                    reject("Mehrere Benutzer*innen mit CN " + cn + " gefunden");
                } else {
                    resolve(entries[0]);
                }
            });
        });
    });
};






var passwordValid = function(password) {

    // console.log("Passwort: " + password + " match: " +password.match('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_=+-]).{8,30}$'));
    var result = zxcvbn(password);
    if (result.score <=2 ) {
      return false;
    } else {
      return true;
    }
}

exports.ldapAttributeToArray = function(ldapAttribute) {
  if (ldapAttribute && ldapAttribute instanceof Array) {
    return ldapAttribute.slice().filter(function(e){ return e === 0 || e }); // filter empty array elements
  } else if (ldapAttribute != null && ldapAttribute != "") {
    return [ldapAttribute];
  } else {
    return [];
  }
}

exports.dnToCn = function(dn) {
    if (dn && dn.includes(',') && dn.includes('=')) {
        return dn.split(',')[0].split('=')[1];
    } else {
        return;
    }
}

exports.fetchIsAdmin = function(userDn) {
    return new Promise((resolve, reject) => {

        var opts = {
        };

        var admin = null;

        client.search('cn=admin,ou=groups,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                if (entry.object.member && entry.object.member.indexOf(userDn) > -1){
                    admin = true;
                } else {
                    admin = false;
                }
            });
            res.on('error', function(err) {
                reject('isAdmin error: ' + err.message);
            });
            res.on('end', function(result) {
                resolve(admin);
            });
        });
    })

};


/*
exports.populateParentGroups = function(user, groups) {
    return new Promise((resolve, reject) => {
        var filter = '(|';
        groups.forEach(group => {
            filter += '(member=' + group + ')';
        })
        filter += ')';
        var opts = {
            scope: 'sub',
            filter: filter
        };


        var entries = [], newParentGroups = [];

        client.search('ou=groups,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                entries.push(entry.object);
            });
            res.on('error', function(err) {
                reject('Error populating parent groups: ' + err.message);
            });
            res.on('end', function(result) {
                entries.forEach((group) => { 
                    if (!user.member.includes(group.dn)) {
                        user.member.push(group.dn);
                        newParentGroups.push(group.dn);
                    }
                });
                if (newParentGroups.length > 0) {
                    resolve(exports.populateParentGroups(user, newParentGroups));
                } else {
                    console.log('user: ', user);
                    resolve(user);
                }
            });
        });        
    })
}

exports.populateUserGroups = function(user) {

    return new Promise((resolve, reject) => {


        var opts = {
            scope: 'sub',
            filter: '(|(owner=' + user.dn + ')(member=' + user.dn + '))' 
        };

        var entries = [];

        client.search('ou=groups,'+config.server.base, opts, function(err, res) {
            res.on('searchEntry', function(entry) {
                //console.log('groupentry: '+ JSON.stringify(entry.object));
                //console.log(JSON.stringify(entry.object.member));
                entries.push(entry.object);
            });
            res.on('error', function(err) {
                reject('Error populating user groups: ' + err.message);
            });
            res.on('end', function(result) {
                user.member = [];
                user.owner = [];
                entries.forEach((group) => {            
                    if (group.owner && group.owner.includes(user.dn)) {
                        user.owner.push(group.dn);
                    }
                    if (group.member && group.member.includes(user.dn)) {
                        user.member.push(group.dn);
                    }
                });
                resolve(exports.populateParentGroups(user, user.member));
            });
        });
    });
};
*/




exports.dnToUid = function(dns) {
	return exports.fetchUsers()
		.then(users => {
			uids = [];
			dns.forEach(dn => {
				var user = users.find(user => {
					return user.dn.toLowerCase() === dn.toLowerCase();
				})
				if (user) {
					uids.push(user.uid);
				}
			});
			return uids;
		})
}


exports.findUniqueUID = function(uid, number) {
    var uniqueUID = uid;
    uniqueUID = uid + '_' + number;

    return exports.getByUID(uniqueUID)
        .then((user) => {
            if (user) {
                return exports.findUniqueUID(uid, number+1);
            } else {
                return uniqueUID;
            }

        });
};

exports.encryptAndAddUser = function(entry) {

    return new Promise((resolve, reject) => {

        entry.objectClass = ['inetOrgPerson','posixAccount','top', 'organizationalPerson'];
        entry.gidNumber = 500;
        entry.homeDirectory = 'home/users/'+entry.uid;
        entry.uidNumber = Date.now();

        ssha.ssha_pass(entry.userPassword, function(err, hash) {
            if (err) {
                reject('Fehler beim Passwortverschlüsseln: ' + err);
            }

            entry.userPassword = hash;
            client.add('cn=' + entry.cn + ',ou=users,'+config.server.base, entry, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })
    });
};

;

exports.hashPassword = function(password) {
    return new Promise((resolve, reject) => {
        ssha.ssha_pass(password, function(err, hash) {
            if (err) {
                reject('Fehler beim Passwortverschlüsseln: ' + err);
            } else {
                resolve(hash);
            }

        });
    });
};

exports.updatePassword = function(uid, userPassword, userPassword2) {

    return Promise.resolve()
        .then(() => {

            if (userPassword != userPassword2) {
                throw "Passwörter sind unterschiedlich";
            } else if (userPassword && !passwordValid(userPassword)) {
                throw "Passwort muss den Vorgaben entsprechen";
            }

            return exports.getByUID(uid)
                .then((user) => {
                    if (!user) {
                        throw "Benutzer*in " + uid + " nicht gefunden";
                    }

                    return hashPassword(userPassword)
                        .then((hash) => {

                            return new Promise((resolve, reject) => {

                                var change = new ldap.Change( {
                                    operation: 'replace',
                                    modification: {
                                        userPassword: hash
                                    }
                                });
                                client.modify('cn=' +user.cn + ',ou=users,'+config.server.base, change, function(err) {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                })
                            })
                        });
            });
        })
};


exports.remove = function(dn) {
    return new Promise((resolve, reject) => {
        client.del(dn, function(err) {
            if(err) {
                reject(err);
            } else {
                resolve();
            }
        });
    })
};

exports.add = function(dn, entry) {
    return new Promise((resolve, reject) => {
        client.add(dn, entry, function(err) {
            if(err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}



