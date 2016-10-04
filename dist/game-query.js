'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
      var _this = this;

      var query = this.storage.refGameData().orderByChild('endedAt');

      query.limitToLast(1).once('value', function (snapshot) {
        var game = snapshot.val();

        if (game) {
          query = query.startAt(game.endedAt);
        }

        // setup listener
        query.on('child_added', function (snap) {
          return cb(snap.val());
        });
        _this.storage._listeners.push(query);
      });
    }
  }, {
    key: 'queryTotalGamesPlayed',
    value: function queryTotalGamesPlayed() {
      var _this2 = this;

      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this2.storage.refGameData().once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTotalGamesWithStatLesser',
    value: function queryTotalGamesWithStatLesser(prop, value) {
      var _this3 = this;

      value = value || 0;
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this3.storage.refGameData().orderByChild(prop).endAt(value).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTotalGamesWithStatGreater',
    value: function queryTotalGamesWithStatGreater(prop, value) {
      var _this4 = this;

      value = value || 0;
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this4.storage.refGameData().orderByChild(prop).startAt(value).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTotalGamesWithStatBetween',
    value: function queryTotalGamesWithStatBetween(prop, start, end) {
      var _this5 = this;

      value = value || 0;
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this5.storage.refGameData().orderByChild(prop).startAt(start).endAt(end).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }, {
    key: 'queryTotalGamesWithStatEqual',
    value: function queryTotalGamesWithStatEqual(prop, value) {
      var _this6 = this;

      value = value || 0;
      var promise = new _rsvp2.default.Promise(function (resolve) {
        _this6.storage.refGameData().orderByChild(prop).startAt(value).endAt(value).once('value', function (snapshot) {
          resolve(snapshot.numChildren());
        });
      });
      return promise;
    }
  }]);

  return GameQuery;
}();

module.exports = GameQuery;