'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _rsvp = require('rsvp');

var _rsvp2 = _interopRequireDefault(_rsvp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GameStorage = function () {
  function GameStorage(name, firebase) {
    _classCallCheck(this, GameStorage);

    this.name = name;
    this.mode = 'standard';
    this._firebase = firebase;
    this._listeners = [];
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
      var uid = this.firebaseAuth().currentUser.uid;
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
        return listener.off();
      });
    }
  }, {
    key: 'onGamePlayed',
    value: function onGamePlayed(cb) {
      var query = this.refGameData().orderByChild('endedAt').startAt(_firebase2.default.database.ServerValue.TIMESTAMP);
      query.on('child_added', cb);
      _listeners.push(query);
      return query;
    }
  }, {
    key: 'queryTotalUsersPlayed',
    value: function queryTotalUsersPlayed() {
      var _this = this;

      var childProp = this._getStatKey('played');
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this.refUserData().orderByChild(childProp).startAt(1).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTotalGamesPlayed',
    value: function queryTotalGamesPlayed() {
      var _this2 = this;

      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this2.refGameData().once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryUserStatValue',
    value: function queryUserStatValue(prop) {
      var _this3 = this;

      var childProp = this._getStatKey(prop);
      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        _this3.refLoggedInUserData(childProp).once('value', function (snapshot) {
          var val = snapshot.val();
          if (val !== null) {
            resolve(val);
          } else {
            reject();
          }
        });
      });
      return promise;
    }
  }, {
    key: 'queryUserStatRanking',
    value: function queryUserStatRanking(prop) {
      var _this4 = this;

      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        _this4.queryUserStatValue(prop).then(function (value) {
          _this4.queryTotalUsersWithStat(prop, value).then(function (total) {
            resolve(total);
          }).catch(reject);
        }).catch(reject);
      });
      return promise;
    }
  }, {
    key: 'queryTotalUsersWithStat',
    value: function queryTotalUsersWithStat(prop, value) {
      var _this5 = this;

      value = value || 0;
      var childProp = this._getStatKey(prop);
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this5.refUserData().orderByChild(childProp).startAt(value).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTotalGamesWithStat',
    value: function queryTotalGamesWithStat(prop, value) {
      var _this6 = this;

      value = value || 0;
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this6.refGameData().orderByChild(prop).startAt(value).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'saveGamePlayed',
    value: function saveGamePlayed(data) {
      var _this7 = this;

      var origKeys = Object.keys(data);
      var gamedata = {
        endedAt: _firebase2.default.database.ServerValue.TIMESTAMP,
        uid: this.firebaseAuth().currentUser ? this.firebaseAuth().currentUser.uid : '',
        mode: this.mode
      };
      origKeys.forEach(function (key) {
        gamedata[key] = data[key];
      });

      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        var promises = [];
        promises.push(_this7.refGameData().push().set(gamedata));

        // update stats for mode
        promises.push(_this7.incrementUserGameStat(_this7._getStatKey('played')));
        promises.push(_this7.saveUserGameStat(_this7._getStatKey('lastplayed'), _firebase2.default.database.ServerValue.TIMESTAMP));
        origKeys.forEach(function (key) {
          promises.push(_this7.saveMaxUserGameStat(_this7._getStatKey(key), gamedata[key]));
        });

        // update stats for totals
        promises.push(_this7.incrementUserGameStat(_this7._getTotalKey('played')));
        promises.push(_this7.saveUserGameStat(_this7._getTotalKey('lastplayed'), _firebase2.default.database.ServerValue.TIMESTAMP));

        _rsvp2.default.all(promises).then(resolve).catch(reject);
      });
      return promise;
    }
  }, {
    key: 'queryTopUserStatValues',
    value: function queryTopUserStatValues(stat, n) {
      n = n || 1;
      var childProp = this._getStatKey(stat);
      var values = [];
      var query = this.refUserData().orderByChild(childProp).limitToLast(n);
      var promise = new _rsvp2.default.Promise(function (resolve) {
        query.on('child_added', function (snapshot) {
          values.push(snapshot.child(childProp).val());
          if (values.length === n) {
            done();
          }
        });

        var done = function done() {
          clearTimeout(timeout);
          query.off('child_added');
          values.sort(function (a, b) {
            return b - a;
          });
          resolve(values);
        };
        var timeout = setTimeout(done, 5000);
      });
      return promise;
    }
  }, {
    key: 'incrementUserGameStat',
    value: function incrementUserGameStat(stat, inc) {
      return this._saveUserGameStat(stat, 'inc', inc || 1);
    }
  }, {
    key: 'saveUserGameStat',
    value: function saveUserGameStat(stat, newValue) {
      return this._saveUserGameStat(stat, 'last', newValue);
    }
  }, {
    key: 'saveMaxUserGameStat',
    value: function saveMaxUserGameStat(stat, newValue) {
      return this._saveUserGameStat(stat, 'max', newValue);
    }
  }, {
    key: 'saveMinUserGameStat',
    value: function saveMinUserGameStat(stat, newValue) {
      return this._saveUserGameStat(stat, 'min', newValue);
    }
  }, {
    key: '_saveUserGameStat',
    value: function _saveUserGameStat(stat, type, value) {
      var ref = this.refLoggedInUserData(stat);
      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        ref.once('value', function (snapshot) {
          var oldValue = snapshot.val() || 0;
          var newValue = void 0,
              save = false;
          switch (type) {
            case 'inc':
              newValue = oldValue + value;
              save = true;
              break;
            case 'max':
              if (value > oldValue) {
                newValue = value;
                save = true;
              }
              break;
            case 'min':
              if (value < oldValue) {
                newValue = value;
                save = true;
              }
              break;
            case 'last':
              newValue = value;
              save = true;
              break;
          }

          if (save) {
            ref.set(newValue).then(resolve).catch(reject);
          } else {
            resolve();
          }
        });
      });
      return promise;
    }
  }, {
    key: '_getTotalKey',
    value: function _getTotalKey(stat) {
      return this.name + '-total-' + stat;
    }
  }, {
    key: '_getStatKey',
    value: function _getStatKey(stat) {
      return this.name + '-' + this.mode + '-' + stat;
    }
  }, {
    key: 'firebaseAuth',
    value: function firebaseAuth() {
      return this._firebase.auth();
    }
  }, {
    key: 'waitForAuth',
    value: function waitForAuth() {
      var auth = this.firebaseAuth();
      var promise = new _rsvp2.default.Promise(function (resolve) {
        var callback = function callback() {
          off();
          resolve();
        };
        var off = auth.onAuthStateChanged(callback);
      });
      return promise;
    }
  }, {
    key: 'requireAuth',
    value: function requireAuth() {
      var _this8 = this;

      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        _this8.waitForAuth().then(function () {
          if (!_this8.firebaseAuth().currentUser) {
            _this8.firebaseAuth().signInAnonymously().then(resolve).catch(reject);
          } else {
            resolve();
          }
        }).catch(reject);
      });
      return promise;
    }
  }]);

  return GameStorage;
}();

module.exports = GameStorage;