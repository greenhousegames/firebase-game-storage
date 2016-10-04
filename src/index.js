import firebase from 'firebase';
import rsvp from 'rsvp';
import Auth from './auth';
import Metrics from './metrics';

class GameStorage {
  constructor(config) {
    this.name = config.name;
    this.mode = 'standard';
    this._firebase = config.firebase;
    this._queries = [];
    this.auth = new Auth(firebase);

    const metricConfig = JSON.parse(JSON.stringify(config.metrics));
    metricConfig.endedAt = ['first', 'last'];
    metricConfig.played = ['sum'];
    this.metrics = new Metrics(this);
    this.metrics.initializeRules(metricConfig);
  }

  getMode(mode) {
    const storage = new GameStorage(this.name, this._firebase);
    storage.mode = mode;
    return storage;
  }

  refGameData(path) {
    let ref = this._firebase.database().ref('games').child(this.name);
    if (path) {
      ref = ref.child(path);
    }
    return ref;
  }

  refUserData(path) {
    let ref = this._firebase.database().ref('users');
    if (path) {
      ref = ref.child(path);
    }
    return ref;
  }

  refLoggedInUserData(path) {
    const uid = this.auth.currentUserUID();
    if (!uid) {
      return null;
    } else {
      let ref = this.refUserData().child(uid);
      if (path) {
        ref = ref.child(path);
      }
      return ref;
    }
  }

  off() {
    this._queries.forEach((q) => {
      q.off('child_added');
      q.off('child_removed');
    });
  }

  onGamePlayed(cb) {
    let query = this.refGameData().orderByChild('endedAt');

    query.limitToLast(1).once('value', (snapshot) => {
      const games = snapshot.val();
      const keys = Object.keys(games);

      if (keys.length > 0) {
        query = query.startAt(games[keys[0]].endedAt + 1);
      }

      // setup listener
      query.on('child_added', (snap) => cb(snap.val()));
      this._queries.push(query);
    });
  }

  saveGamePlayed(data) {
    const origKeys = Object.keys(data);
    const gamedata = {
      endedAt: firebase.database.ServerValue.TIMESTAMP,
      uid: this.auth.currentUserUID(),
      mode: this.mode,
      played: 1
    };
    origKeys.forEach((key) => {
      gamedata[key] = data[key];
    });

    const promise = new rsvp.Promise((resolve, reject) => {
      const promises = [];
      promises.push(this.refGameData().push().set(gamedata));
      promises.push(this.metrics.saveMetrics(gamedata));

      rsvp.all(promises).then(resolve).catch(reject);
    });
    return promise;
  }
}

module.exports = GameStorage;
