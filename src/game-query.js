import firebase from 'firebase';
import rsvp from 'rsvp';

class GameQuery {
  constructor(storage) {
    this.storage = storage;
  }

  onPlayed(cb) {
    const query = this.storage.refGameData()
      .orderByChild('endedAt')
      .startAt(firebase.database.ServerValue.TIMESTAMP);
    query.on('child_added', cb);
    this.storage._listeners.push(query);
  }

  queryTotalGamesPlayed() {
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refGameData().once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTotalGamesWithStat(prop, value) {
    value = value || 0;
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refGameData().orderByChild(prop).startAt(value).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }
}

module.exports = GameQuery;
