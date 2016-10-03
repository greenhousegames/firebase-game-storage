import firebase from 'firebase';
import rsvp from 'rsvp';

class GameStorage {
  constructor(name, firebase) {
    this.name = name;
    this.mode = 'standard';
    this._firebase = firebase;
    this._listeners = [];
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
    const uid = this.firebaseAuth().currentUser.uid;
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
    this._listeners.forEach((listener) => listener.off());
  }

  onGamePlayed(cb) {
    const query = this.refGameData()
      .orderByChild('endedAt')
      .startAt(firebase.database.ServerValue.TIMESTAMP);
    query.on('child_added', cb);
    _listeners.push(query);
    return query;
  }

  queryTotalUsersPlayed() {
    const childProp = this._getStatKey('played');
    const promise = new rsvp.Promise((resolve) => {
      this.refUserData().orderByChild(childProp).startAt(1).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTotalGamesPlayed() {
    const promise = new rsvp.Promise((resolve) => {
      this.refGameData().once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryUserStatValue(prop) {
    const childProp = this._getStatKey(prop);
    const promise = new rsvp.Promise((resolve, reject) => {
      this.refLoggedInUserData(childProp).once('value', (snapshot) => {
        const val = snapshot.val();
        if (val !== null) {
          resolve(val);
        } else {
          reject();
        }
      });
    });
    return promise;
  }

  queryUserStatRanking(prop) {
    const promise = new rsvp.Promise((resolve, reject) => {
      this.queryUserStatValue(prop).then((value) => {
        this.queryTotalUsersWithStat(prop, value).then((total) => {
          resolve(total);
        }).catch(reject);
      }).catch(reject);
    });
    return promise;
  }

  queryTotalUsersWithStat(prop, value) {
    value = value || 0;
    const childProp = this._getStatKey(prop);
    const promise = new rsvp.Promise((resolve) => {
      this.refUserData().orderByChild(childProp).startAt(value).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTotalGamesWithStat(prop, value) {
    value = value || 0;
    const promise = new rsvp.Promise((resolve) => {
      this.refGameData().orderByChild(prop).startAt(value).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  saveGamePlayed(data) {
    const origKeys = Object.keys(data);
    const gamedata = {
      endedAt: firebase.database.ServerValue.TIMESTAMP,
      uid: this.firebaseAuth().currentUser ? this.firebaseAuth().currentUser.uid : '',
      mode: this.mode
    };
    origKeys.forEach((key) => {
      gamedata[key] = data[key];
    });

    const promise = new rsvp.Promise((resolve, reject) => {
      const promises = [];
      promises.push(this.refGameData().push().set(gamedata));

      // update stats for mode
      promises.push(this.incrementUserGameStat(this._getStatKey('played')));
      promises.push(this.saveUserGameStat(this._getStatKey('lastplayed'), firebase.database.ServerValue.TIMESTAMP));
      origKeys.forEach((key) => {
        promises.push(this.saveMaxUserGameStat(this._getStatKey(key), gamedata[key]));
      });

      // update stats for totals
      promises.push(this.incrementUserGameStat(this._getTotalKey('played')));
      promises.push(this.saveUserGameStat(this._getTotalKey('lastplayed'), firebase.database.ServerValue.TIMESTAMP));

      rsvp.all(promises).then(resolve).catch(reject);
    });
    return promise;
  }

  queryTopUserStatValues(stat, n) {
    n = n || 1;
    const childProp = this._getStatKey(stat);
    const values = [];
    const query = this.refUserData().orderByChild(childProp).limitToLast(n);
    const promise = new rsvp.Promise((resolve) => {
      query.on('child_added', (snapshot) => {
        values.push(snapshot.child(childProp).val());
        if (values.length === n) {
          done();
        }
      });

      const done = () => {
        clearTimeout(timeout);
        query.off('child_added');
        values.sort((a, b) => b - a);
        resolve(values);
      };
      const timeout = setTimeout(done, 5000);
    });
    return promise;
  }

  incrementUserGameStat(stat, inc) {
    return this._saveUserGameStat(stat, 'inc', inc || 1);
  }

  saveUserGameStat(stat, newValue) {
    return this._saveUserGameStat(stat, 'last', newValue);
  }

  saveMaxUserGameStat(stat, newValue) {
    return this._saveUserGameStat(stat, 'max', newValue);
  }

  saveMinUserGameStat(stat, newValue) {
    return this._saveUserGameStat(stat, 'min', newValue);
  }

  _saveUserGameStat(stat, type, value) {
    const ref = this.refLoggedInUserData(stat);
    const promise = new rsvp.Promise((resolve, reject) => {
      ref.once('value', (snapshot) => {
        const oldValue = snapshot.val() || 0;
        let newValue, save = false;
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

  _getTotalKey(stat) {
    return this.name + '-total-' + stat;
  }

  _getStatKey(stat) {
    return this.name + '-' + this.mode + '-' + stat;
  }

  firebaseAuth() {
    return this._firebase.auth();
  }

  waitForAuth() {
    const auth = this.firebaseAuth();
    const promise = new rsvp.Promise((resolve) => {
      const callback = () => {
        off();
        resolve();
      };
      const off = auth.onAuthStateChanged(callback);
    });
    return promise;
  }

  requireAuth() {
    const promise = new rsvp.Promise((resolve, reject) => {
      this.waitForAuth().then(() => {
        if (!this.firebaseAuth().currentUser) {
          this.firebaseAuth().signInAnonymously().then(resolve).catch(reject);
        } else {
          resolve();
        }
      }).catch(reject);
    });
    return promise;
  }
}

module.exports = GameStorage;
