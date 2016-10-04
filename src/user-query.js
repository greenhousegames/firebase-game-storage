import rsvp from 'rsvp';

class UserQuery {
  constructor(storage) {
    this.storage = storage;
  }

  queryTotalUsersPlayed() {
    const childProp = this._getStatKey('played');
    const promise = new rsvp.Promise((resolve) => {
      this.storage.refUserData().orderByChild(childProp).startAt(1).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryUserStatValue(prop) {
    const childProp = this._getStatKey(prop);
    const promise = new rsvp.Promise((resolve, reject) => {
      this.storage.refLoggedInUserData(childProp).once('value', (snapshot) => {
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
      this.storage.refUserData().orderByChild(childProp).startAt(value).once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  queryTopUserStatValues(stat, n) {
    n = n || 1;
    const childProp = this._getStatKey(stat);
    const values = [];
    const query = this.storage.refUserData().orderByChild(childProp).limitToLast(n);
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

  _getStatKey(stat) {
    return this.name + '-' + this.mode + '-' + stat;
  }
}

module.exports = UserQuery;
