import firebase from 'firebase';
import rsvp from 'rsvp';

module.exports = class GameStorage {
  constructor(name, firebase) {
    this.name = name;
    this.mode = null;
    this._firebase = firebase;
  }

  setMode(mode) {
    this.mode = mode;
  }

  gameDataRef(path) {
    let ref = this._firebase.database().ref('games').child(this.name);
    if (path) {
      ref = ref.child(path);
    }
    return ref;
  }

  gameUserDataRef(path) {
    const uid = this.firebaseAuth().currentUser.uid;
    if (!uid) {
      return null;
    } else {
      let ref = this._firebase.database().ref('users').child(this.firebaseAuth().currentUser.uid).child(this.name);
      if (path) {
        ref = ref.child(path);
      }
      return ref;
    }
  }

  queryTotalGamesPlayed() {
    const promise = new rsvp.Promise((resolve) => {
      this.gameDataRef().once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  saveGamePlayed(data) {
    const origKeys = Object.keys(data);
    const gamedata = {
      endedAt: firebase.database.ServerValue.TIMESTAMP,
      uid: this.firebaseAuth().currentUser ? this.firebaseAuth().currentUser.uid : ''
    };
    origKeys.forEach((key) => {
      gamedata[key] = data[key];
    });

    const promise = new rsvp.Promise((resolve, reject) => {
      const promises = [];
      promises.push(this.gameUserDataRef().push().set(gamedata));

      // update stats for mode
      promises.push(this.incrementGameStat(this.mode + '-played'));
      origKeys.forEach((key) => {
        promises.push(this.saveMaxGameStat(this.mode + '-' + key, gamedata[key]));
      });

      // update stats for totals
      promises.push(this.incrementUserGameStat('total-played'));

      rsvp.all(promises).then(resolve).catch(reject);
    });
    return promise;
  }

  incrementUserGameStat(stat, inc) {
    return _saveGameStat(stat, 'inc', inc || 1);
  }

  saveMaxUserGameStat(stat, newValue) {
    return _saveGameStat(stat, 'max', newValue);
  }

  saveMinUserGameStat(stat, newValue) {
    return _saveGameStat(stat, 'min', newValue);
  }

  getTopUserGameStat(stat, n) {
    n = n || 1;
    const childProp = this.mode + '-' + stat;
    const values = [];
    const query = this.gamestatsRef.orderByChild(childProp).limitToLast(n);
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

  _saveGameStat(stat, type, value) {
    const ref = this.gameUserDataRef(stat);
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
};
