var monk = require('monk');
var Proxy = require('../Proxy');

function MongoAccess(mongoConnectionString, proxiesCollectionName) {
    this._monkInstance = monk(mongoConnectionString);
    this._proxiesCollectionName = proxiesCollectionName;
}

/* Gets a proxy from the database that its last use time was before the maxLastUsedTime (timestamp). */
MongoAccess.prototype.getProxy = function (maxLastUsedTime, callback) {
    var collection = this._monkInstance.get(this._proxiesCollectionName);


    /* Handles proxies find results */
    var findCallback = function (err, docs) {
        if (err) {
            /* Failed to get proxy from db */
            console.log(err);
            callback(err);
            return;
        }

        if (docs !== null && docs.length !== 0) {
            var proxy = docs.sort(Proxy.compare)[0];
            callback(null, proxy);
        }
        else {
            var errorMessage = "No proxy that matches the criteria";
            console.log(errorMessage);
            callback(errorMessage);
        }
    };


    collection.find({
        $and: [
            {_lastUsedTime: {$lt: maxLastUsedTime}},
            {_active: true}]
    }, findCallback);
};

/* Updates the given proxy�s _lastUsedTime property to the given usedTime. */
MongoAccess.prototype.updateProxyLastUsedTime = function (proxy, usedTime) {

    this._checkProxyType(proxy);

    if (proxy._lastUsedTime === undefined) {
        throw "argument is not of required type.";
    }

    proxy._lastUsedTime = usedTime;

    var collection = this._monkInstance.get(this._proxiesCollectionName);

    collection.updateById(proxy._id, proxy, function () {
        console.log("_lastUsedTime successfully updated");
    });
};

/* Adds a new proxy to the database. */
MongoAccess.prototype.addProxy = function (proxy, callback) {
    this._checkProxyType(proxy);

    var collection = this._monkInstance.get(this._proxiesCollectionName);
    collection.insert(proxy, callback);
};

/* Checks if the proxy exists in the db. If exists returns it, else returns false */
MongoAccess.prototype.isProxyExists = function (proxy, callback) {
    this._checkProxyType(proxy);

    var findCallback = function (err, docs) {
        if (err) {
            callback(err);
            return;
        }


        if (docs !== null && docs.length !== 0) {
            callback(null, docs[0]);
        }
        else {
            callback(null, false);
        }
    };

    var collection = this._monkInstance.get(this._proxiesCollectionName);
    collection.find({
        $and: [
            {_address: proxy._address},
            {_port: proxy._port}
        ]
    }, findCallback);

};

/* Reports the given proxy activity state. */
MongoAccess.prototype.reportProxyActivity = function (proxy, active) {

    this._checkProxyType(proxy);

    var collection = this._monkInstance.get(this._proxiesCollectionName);
    collection.findAndModify(
        {
            query: {
                $and: [
                    {
                        _address: proxy._address
                    },
                    {
                        _port: proxy._port
                    }
                ]
            }, update: {
            $set: {
                _active: active
            }
        }
        });
};

MongoAccess.prototype._checkProxyType = function (proxy) {
    if (!(Proxy.isProxy(proxy))) {
        throw "argument is not of required type.";
        //console.log("argument is not of required type.");
    }
};

module.exports = MongoAccess;