const config    = require('../config/config.json');
const request = require('request-promise');
const querystring = require('query-string');
const ldaphelper = require('../utils/ldaphelper');
const crypto = require('crypto');
const Promise = require("bluebird");

var buildOptions = function(method, url, parameters = undefined) {
  var options = {
    method: method,
    uri: config.discourse.APIURL + '/' + url,
    headers: {
        'User-Agent': 'habiDAT-User-Module',
        'Api-Key': config.discourse.APIKEY,
        'Api-Username': config.discourse.USERNAME
    },
    json: true
  }
  if (parameters && method == 'GET') {
    options.uri += querystring.stringify(parameters)
  } else if (parameters) {
    options.form = parameters;
  }
  options.strictSSL = false;
  return options;
}

exports.put = function(url, parameters) {
    console.log('put', url, parameters);
  return request(buildOptions('PUT', url, parameters));
}

exports.get = function(url, parameters) {
    console.log('get', url, parameters);
  return request(buildOptions('GET', url, parameters));
};

exports.del = function(url, parameters) {
    console.log('del', url, parameters);
  return request(buildOptions('DELETE', url, parameters));
};

exports.post = function(url, parameters) {
    console.log('post', url, parameters);
  return request(buildOptions('POST', url, parameters));
};

Array.prototype.insensitiveIndexOf = function (searchElement, fromIndex) {
    return this.map(function (value) {
        return value.toLowerCase();
    }).indexOf(searchElement.toLowerCase(), fromIndex);
};

exports.syncUser = function(user) {
  var groups = user.memberGroups.map(group => { return group.cn;});
  var hmac = crypto.createHmac("sha256", config.discourse.SSOSECRET);
  var params = {
    external_id: user.uid,
    email: user.mail,
    username: user.uid,
    name: user.cn,
    title: user.title,
    groups: groups.join(',')
  }
  var payload = new Buffer(querystring.stringify(params) , 'utf8').toString("base64");
  hmac.update(payload);
  var postParams = {
      'sso': payload,
      'sig': hmac.digest('hex')
    }
  return exports.post('admin/users/sync_sso', postParams)
    .then(() => { return user; })
}












exports.createUser = function(name, email, password, username, title) {
    return exports.post('users', {name: name, email: email, password: password, username: username, active: true, approved: true})
        .then(response => {
            if (!response.active || !response.success) {
                throw "Benutzer*in erstellt, konnte aber nicht aktiviert werden: " + response.message;
            } else {
                return exports.put('u/'+ username + '.json', {title: title})
                    .then(response => {
                        return response.user;
                    })
            }

        });
};

exports.modifyUser = function(name, username, title) {
    return  exports.put('u/'+ username + '.json', {name: name, username: username, title: title})
        .then(response => {
            return response.user;
        });
};



exports.getCategory = function(id) {
    return exports.get('c/' + id + "/show.json")
        .then(categoryObject => {
            categoryObject.category.groups = categoryObject.category.group_permissions.map((groupPermission) => {
                if (groupPermission.permission_type == 1) {
                    return groupPermission.group_name;
                }
            })
            if (categoryObject.category.uploaded_logo) {
                categoryObject.category.image = config.discourse.APIURL + '/' + categoryObject.category.uploaded_logo.url;
            }
            return categoryObject.category;
        })
};

exports.getCategoryWithParent = function(id) {
    return Promise.join(exports.get('categories_and_latest'), exports.getCategory(id),
        (categoriesObject, category) => {
            category.parent = categoriesObject.category_list.categories.find(topCategory => {
                return topCategory.subcategory_ids && topCategory.subcategory_ids.includes(category.id);
            });
            return category;
        });
};


exports.getCategories = function() {

    return exports.get('categories_and_latest')
        .then(categoriesObject => {

            var categoryIDs =[];
            categoriesObject.category_list.categories.forEach(topCategory => {
              categoryIDs.push({parent: null, id: topCategory.id});
                if (topCategory.subcategory_ids) {
                    topCategory.subcategory_ids.forEach(function(subcategory) {
                        categoryIDs.push({parent: topCategory.id, id: subcategory});
                    });
                }
            })
            return Promise.all(categoryIDs.map(categoryId => {
                return exports.getCategory(categoryId.id)
                    .then(category => {
                        category.parent = categoryId.parent;
                        return category;
                    })
                }))
        })
        .then(categories => {
            // make tree out of flat list
            return categories
                .filter(category => { return category.parent == null; })
                .map(rootCategory => {
                    rootCategory.subCategories = categories.filter(category => { return category.parent && category.parent === rootCategory.id; });
                    return rootCategory;
                })
        });
};

exports.getGroupMembers = function(groupName) {
	return exports.get('groups/' + groupName + '/members.json?limit=1000')
		.then(result => {
			return result.members.map(member => {
				return member.username;
			});
		})
}

exports.addGroupMembers = function(groupId, newMembers) {
	return Promise.resolve()
		.then(() => {
			if (newMembers.length > 0) {
				return exports.put('groups/' + groupId + '/members.json', {usernames: newMembers.join(',')});
			} else {
				return;
			}
		});
}

exports.removeGroupMembers = function(groupId, members) {
	return Promise.resolve()
		.then(() => {
			if (members.length > 0) {
				return exports.del('groups/' + groupId + '/members.json', {usernames: members.join(',')});
			} else {
				return;
			}
		});
}

exports.getParentCategories = function(done) {
    return exports.get('categories_and_latest')
        .then(categoriesObject => { return categoriesObject.category_list.categories; });
};

