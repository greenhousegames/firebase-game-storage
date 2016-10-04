'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _rsvp = require('rsvp');

var _rsvp2 = _interopRequireDefault(_rsvp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GameQuery = function () {
  function GameQuery(storage) {
    _classCallCheck(this, GameQuery);

    this.storage = storage;
  }

  _createClass(GameQuery, [{
    key: 'onPlayed',
    value: function onPlayed(cb) {
      var query = this.storage.refGameData().orderByChild('endedAt').startAt(_firebase2.default.database.ServerValue.TIMESTAMP);
      query.on('child_added', cb);
      this.storage._listeners.push(query);
    }
  }, {
    key: 'queryTotalGamesPlayed',
    value: function queryTotalGamesPlayed() {
      var _this = this;

      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this.storage.refGameData().once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTotalGamesWithStat',
    value: function queryTotalGamesWithStat(prop, value) {
      var _this2 = this;

      value = value || 0;
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this2.storage.refGameData().orderByChild(prop).startAt(value).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }]);

  return GameQuery;
}();

module.exports = GameQuery;