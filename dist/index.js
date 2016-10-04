'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _rsvp = require('rsvp');

var _rsvp2 = _interopRequireDefault(_rsvp);

var _gameQuery = require('./game-query');

var _gameQuery2 = _interopRequireDefault(_gameQuery);

var _userQuery = require('./user-query');

var _userQuery2 = _interopRequireDefault(_userQuery);

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
    this._listeners = [];
    this.queries = {
      games: new _gameQuery2.default(this),
      users: new _userQuery2.default(this)
    };
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
      var storage = new GameStorage(this.name, this._firebase);
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
      this._listeners.forEach(function (listener) {
        listener.off('child_added');
        listener.off('child_removed');
      });
    }
  }, {
    key: 'onGamePlayed',
    value: function onGamePlayed(cb) {
      return this.queries.game.onPlayed(cb);
    }
  }, {
    key: 'saveGamePlayed',
    value: function saveGamePlayed(data) {
      var _this = this;

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
        promises.push(_this.refGameData().push().set(gamedata));
        promises.push(_this.metrics.saveMetrics(gamedata));

        _rsvp2.default.all(promises).then(resolve).catch(reject);
      });
      return promise;
    }
  }]);

  return GameStorage;
}();

module.exports = GameStorage;