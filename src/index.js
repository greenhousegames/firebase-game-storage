import firebase from 'firebase';
import rsvp from 'rsvp';
import GameQuery from './game-query';
import UserQuery from './user-query';
import Auth from './auth';
import Metrics from './metrics';

class GameStorage {
  constructor(config) {
    this.name = config.name;
    this.mode = 'standard';
    this._firebase = config.firebase;
    this._listeners = [];
    this.queries = {
      games: new GameQuery(this),
      users: new UserQuery(this)
    };
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
    this._listeners.forEach((listener) => {
      listener.off('child_added');
      listener.off('child_removed');
    });
  }

  onGamePlayed(cb) {
    return this.queries.game.onPlayed(cb);
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
