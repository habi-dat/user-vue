var Promise = require("bluebird");
var config  = require('../config/config.json');

var getTitle = function(page) {
    return config.settings.general.title + ' - ' + page;
};

exports.render = function(req, res, template, title, data = {}, errorMessages = true) {
    data.title = getTitle(title);
    data.titleShort = title;
    if (errorMessages) {
        data.notification = req.flash('notification');
        data.responses = req.flash('responses');
        data.message = req.flash('error');
    }
    return new Promise((resolve, reject) => {
        res.render(template, data);
        resolve();
    });
};

exports.errorPage = function(req, res, error) {   
    console.log('error: ' + JSON.stringify(error) + "\n" + error.stack);
    res.render('error', { message : JSON.stringify(error), error: error, title: 'Fehler'});
};

exports.setSessionData = function(req, data) {
    req.session.data = data;
}

exports.retrieveSessionData = function(req) {
    if (req.session.data) {
        var data = req.session.data;
        delete req.session.data;
        return data;
    } else {
        return;
    }
}

exports.checkResponseAndRedirect = function(req, res, response, successMsg, errorMsg, target, errorTarget = undefined, data = undefined) {
    return new Promise((resolve, reject) => {
        req.flash('responses', response.responses);
        if (response.status) {
            req.flash('notification', successMsg);
            res.redirect(target);
        } else {
            req.flash('error', errorMsg);
            if (data) {
                setSessionData(req, data);
            }
            res.redirect(errorTarget?errorTarget:target);
        }
        resolve();
    });
};

exports.errorRedirect = function(req, res, errorMsg, target) {
    return new Promise((resolve, reject) => {
        req.flash('error', errorMsg);
        res.redirect(target);
        resolve();
    });
};


exports.successRedirect = function(req, res, successMsg, target) {
    return new Promise((resolve, reject) => {
        req.flash('notification', successMsg);
        res.redirect(target);
        resolve();
    });
};

