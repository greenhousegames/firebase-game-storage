import rsvp from 'rsvp';

class GameQuery {
  constructor(storage) {
    this.storage = storage;
  }

  onPlayed(cb) {
    let query = this.storage.refGameData()
      .orderByChild('endedAt');

    query.limitToLast(1).once('value', (snapshot) => {
      const game = snapshot.val();

      if (game) {
        query = query.startAt(game.endedAt);
      }

      // setup listener
      query.on('child_added', (snap) => cb(snap.val()));
      this.storage._listeners.push(query);
    });
  }

  queryTotalGamesPlayed() {
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refGameData().once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTotalGamesWithStatLesser(prop, value) {
    value = value || 0;
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refGameData().orderByChild(prop).endAt(value).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTotalGamesWithStatGreater(prop, value) {
    value = value || 0;
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refGameData().orderByChild(prop).startAt(value).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTotalGamesWithStatBetween(prop, start, end) {
    value = value || 0;
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refGameData().orderByChild(prop).startAt(start).endAt(end).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTotalGamesWithStatEqual(prop, value) {
    value = value || 0;
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refGameData().orderByChild(prop).startAt(value).endAt(value).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }
}

module.exports = GameQuery;
