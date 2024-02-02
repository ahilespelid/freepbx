"use strict";
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 
/*
      This file defines functions for recovering from a crash or restart.
      It is called once on queue startup, and basically asks asterisk for
      all the channels and bridges, and uses the QREC channel variable
      to decide what to do with any old queue calls.
*/

var Promise = require('bluebird');
var fsPromise = require("../lib/promise_fs.js");

module.exports = { recover: recover };

function recover(qm) {

    return Promise.resolve().then(function () {

        return recoverOfflineCalls(qm);

    }).then(function () {
        qm.log("recovery complete");
        return true;
    }).catch(function (e) {
        qm.log("recover failed.", e.toString(), e.stack);
        return false;
    });
}

// go look in /var/lib/nodequeue for offline call recovery files, and
// recover them.
function recoverOfflineCalls(qm) {
    return fsPromise.readdirAsync(qm.statsDir).then(function (files) {
        files = files.filter(function (a) { return /^offline\./.test(a); });

        qm.log("offline recovery files:", files);

        return Promise.reduce(files, function (unused, file) {
            file = qm.statsDir + "/" + file;
            return fsPromise.readFileAsync(file).then(function (json) {
                var data = JSON.parse(json);
                return qm.recoverOfflineCall(data);
            });
        });

    });
}
