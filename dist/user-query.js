'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _rsvp = require('rsvp');

var _rsvp2 = _interopRequireDefault(_rsvp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UserQuery = function () {
  function UserQuery(storage) {
    _classCallCheck(this, UserQuery);

    this.storage = storage;
  }

  _createClass(UserQuery, [{
    key: 'queryTotalUsersPlayed',
    value: function queryTotalUsersPlayed() {
      var _this = this;

      var childProp = this._getStatKey('played');
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this.storage.refUserData().orderByChild(childProp).startAt(1).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryUserStatValue',
    value: function queryUserStatValue(prop) {
      var _this2 = this;

      var childProp = this._getStatKey(prop);
      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        _this2.storage.refLoggedInUserData(childProp).once('value', function (snapshot) {
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
      var _this3 = this;

      var promise = new _rsvp2.default.Promise(function (resolve, reject) {
        _this3.queryUserStatValue(prop).then(function (value) {
          _this3.queryTotalUsersWithStat(prop, value).then(function (total) {
            resolve(total);
          }).catch(reject);
        }).catch(reject);
      });
      return promise;
    }
  }, {
    key: 'queryTotalUsersWithStat',
    value: function queryTotalUsersWithStat(prop, value) {
      var _this4 = this;

      value = value || 0;
      var childProp = this._getStatKey(prop);
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this4.storage.refUserData().orderByChild(childProp).startAt(value).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTopUserStatValues',
    value: function queryTopUserStatValues(stat, n) {
      n = n || 1;
      var childProp = this._getStatKey(stat);
      var values = [];
      var query = this.storage.refUserData().orderByChild(childProp).limitToLast(n);
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
    key: '_getStatKey',
    value: function _getStatKey(stat) {
      return this.name + '-' + this.mode + '-' + stat;
    }
  }]);

  return UserQuery;
}();

module.exports = UserQuery;