'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _rsvp = require('rsvp');

var _rsvp2 = _interopRequireDefault(_rsvp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Auth = function () {
  function Auth(firebase) {
    _classCallCheck(this, Auth);

    this._firebase = firebase;
  }

  _createClass(Auth, [{
    key: 'currentUser',
    value: function currentUser() {
      return this.firebaseAuth().currentUser;
    }
  }, {
    key: 'currentUserUID',
    value: function currentUserUID() {
      return this.firebaseAuth().currentUser ? this.firebaseAuth().currentUser.uid : '';
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
      var _this = this;

      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        _this.waitForAuth().then(function () {
          if (!_this.firebaseAuth().currentUser) {
            _this.firebaseAuth().signInAnonymously().then(resolve).catch(reject);
          } else {
            resolve();
          }
        }).catch(reject);
      });
      return promise;
    }
  }]);

  return Auth;
}();

module.exports = Auth;