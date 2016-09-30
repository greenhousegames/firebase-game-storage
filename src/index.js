import rsvp from 'rsvp';

module.exports = class GameStorage {
  constructor(name, firebase) {
    this.name = name;
    this._firebase = firebase;
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

  incrementUserGameStat(stat, inc) {
    _saveGameStat(stat, 'inc', inc || 1);
  }

  saveMaxUserGameStat(stat, newValue) {
    _saveGameStat(stat, 'max', newValue);
  }

  saveMinUserGameStat(stat, newValue) {
    _saveGameStat(stat, 'min', newValue);
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
}
