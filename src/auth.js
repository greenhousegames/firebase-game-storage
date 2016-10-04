import rsvp from 'rsvp';

class Auth {
  constructor(firebase) {
    this._firebase = firebase;
  }

  currentUser() {
    return this.firebaseAuth().currentUser;
  }

  currentUserUID() {
    return this.firebaseAuth().currentUser ? this.firebaseAuth().currentUser.uid : '';
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

module.exports = Auth;
