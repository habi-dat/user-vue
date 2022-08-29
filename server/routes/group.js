const auth = require('../utils/auth');
const ldaphelper = require('../utils/ldaphelper');
const discoursehelper = require('../utils/discoursehelper');
const express = require('express');
const Promise = require("bluebird");
const router = express.Router();

router.get('/api/groups', auth.isLoggedInGroupAdmin, function(req, res, next) {
  return Promise.resolve()
    .then(() => {
      if (req.user.isAdmin) {
        return ldaphelper.fetchGroupTree()
      } else {
        return ldaphelper.fetchOwnedGroups(req.user)
          .then(groups => {
            return groups.owner;
          });
      }
    })
    .then(groups => {
      return res.send({groups: groups})
    })
    .catch(error => next);
})

module.exports = router;