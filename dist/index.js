'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _rsvp = require('rsvp');

var _rsvp2 = _interopRequireDefault(_rsvp);

var _auth = require('./auth');

var _auth2 = _interopRequireDefault(_auth);

var _metrics = require('./metrics');

var _metrics2 = _interopRequireDefault(_metrics);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GameStorage = function () {
  function GameStorage(config) {
    _classCallCheck(this, GameStorage);

    this.name = config.name;
    this.mode = 'standard';
    this._firebase = config.firebase;
    this._queries = [];
    this.auth = new _auth2.default(_firebase2.default);

    var metricConfig = JSON.parse(JSON.stringify(config.metrics));
    metricConfig.endedAt = ['first', 'last'];
    metricConfig.played = ['sum'];
    this.metrics = new _metrics2.default(this);
    this.metrics.initializeRules(metricConfig);
  }

  _createClass(GameStorage, [{
    key: 'getMode',
    value: function getMode(mode) {
      var storage = new GameStorage({
        name: this.name,
        firebase: this._firebase,
        metrics: this.metrics.rules
      });
      storage.mode = mode;
      return storage;
    }
  }, {
    key: 'refGameData',
    value: function refGameData(path) {
      var ref = this._firebase.database().ref('games').child(this.name);
      if (path) {
        ref = ref.child(path);
      }
      return ref;
    }
  }, {
    key: 'refUserData',
    value: function refUserData(path) {
      var ref = this._firebase.database().ref('users');
      if (path) {
        ref = ref.child(path);
      }
      return ref;
    }
  }, {
    key: 'refLoggedInUserData',
    value: function refLoggedInUserData(path) {
      var uid = this.auth.currentUserUID();
      if (!uid) {
        return null;
      } else {
        var ref = this.refUserData().child(uid);
        if (path) {
          ref = ref.child(path);
        }
        return ref;
      }
    }
  }, {
    key: 'off',
    value: function off() {
      this._queries.forEach(function (q) {
        q.off('child_added');
        q.off('child_removed');
      });
    }
  }, {
    key: 'onGamePlayed',
    value: function onGamePlayed(cb) {
      var _this = this;

      var query = this.refGameData().orderByChild('endedAt');

      query.limitToLast(1).once('value', function (snapshot) {
        var games = snapshot.val();
        var keys = Object.keys(games);

        if (keys.length > 0) {
          query = query.startAt(games[keys[0]].endedAt + 1);
        }

        // setup listener
        query.on('child_added', function (snap) {
          return cb(snap.val());
        });
        _this._queries.push(query);
      });
    }
  }, {
    key: 'saveGamePlayed',
    value: function saveGamePlayed(data) {
      var _this2 = this;

      var origKeys = Object.keys(data);
      var gamedata = {
        endedAt: _firebase2.default.database.ServerValue.TIMESTAMP,
        uid: this.auth.currentUserUID(),
        mode: this.mode,
        played: 1
      };
      origKeys.forEach(function (key) {
        gamedata[key] = data[key];
      });

      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        var promises = [];
        promises.push(_this2.refGameData().push().set(gamedata));
        promises.push(_this2.metrics.saveMetrics(gamedata));

        _rsvp2.default.all(promises).then(resolve).catch(reject);
      });
      return promise;
    }
  }]);

  return GameStorage;
}();

module.exports = GameStorage;