'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _rsvp = require('rsvp');

var _rsvp2 = _interopRequireDefault(_rsvp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = function () {
  function GameStorage(name, firebase) {
    _classCallCheck(this, GameStorage);

    this.name = config.name;
    this._firebase = config.firebase;
  }

  _createClass(GameStorage, [{
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
    key: 'gameDataRef',
    value: function gameDataRef(path) {
      var ref = this._firebase.database().ref('games').child(this.name);
      if (path) {
        ref = ref.child(path);
      }
      return ref;
    }
  }, {
    key: 'gameUserDataRef',
    value: function gameUserDataRef(path) {
      var uid = this.firebaseAuth().currentUser.uid;
      if (!uid) {
        return null;
      } else {
        var ref = this._firebase.database().ref('users').child(this.firebaseAuth().currentUser.uid).child(this.name);
        if (path) {
          ref = ref.child(path);
        }
        return ref;
      }
    }
  }, {
    key: 'queryTotalGamesPlayed',
    value: function queryTotalGamesPlayed() {
      var _this = this;

      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this.gameDataRef().once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'incrementUserGameStat',
    value: function incrementUserGameStat(stat, inc) {
      _saveGameStat(stat, 'inc', inc || 1);
    }
  }, {
    key: 'saveMaxUserGameStat',
    value: function saveMaxUserGameStat(stat, newValue) {
      _saveGameStat(stat, 'max', newValue);
    }
  }, {
    key: 'saveMinUserGameStat',
    value: function saveMinUserGameStat(stat, newValue) {
      _saveGameStat(stat, 'min', newValue);
    }
  }, {
    key: '_saveGameStat',
    value: function _saveGameStat(stat, type, value) {
      var ref = this.gameUserDataRef(stat);
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
    key: 'firebaseAuth',
    value: function firebaseAuth() {
      return this._firebase.auth();
    }
  }]);

  return GameStorage;
}();