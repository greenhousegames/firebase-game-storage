import rsvp from 'rsvp';

class Metrics {
  constructor(storage) {
    this.storage = storage;
    this.rules = {};
    this.evaluators = {};
  }

  addEvaluator(name, method) {
    this.evaluators[name] = method;
  }

  initializeRules(rules) {
    this.rules = rules;
    this.evaluators = {};
    this.addEvaluator('max', (newVal, oldVal) => newVal > oldVal ? newVal : null);
    this.addEvaluator('min', (newVal, oldVal) => newVal < oldVal ? newVal : null);
    this.addEvaluator('first', () => null);
    this.addEvaluator('last', (newVal) => newVal);
    this.addEvaluator('sum', (newVal, oldVal) => oldVal + newVal);
    this.addEvaluator('diff', (newVal, oldVal) => oldVal - newVal);
    this.addEvaluator('multi', (newVal, oldVal) => oldVal * newVal);
    this.addEvaluator('div', (newVal, oldVal) => oldVal / newVal);
  }

  saveMetrics(data) {
    const promises = [];
    for (var key in data) {
      if (this.rules[key]) {
        // need to store metrics for data
        this.rules[key].forEach((metric) => {
          if (this.evaluators[metric]) {
            promises.push(this._calculateMetricValue(key, data[key], metric, this.evaluators[metric]));
          }
        });
      }
    }
    return rsvp.all(promises);
  }

  getMetrics() {
    const promise = new rsvp.Promise((resolve, reject) => {
      const promises = [];
      const metrics = {};
      for (var key in this.rules) {
        metrics[key] = {};
        this.rules[key].forEach((metric) => {
          if (this.evaluators[metric]) {
            promises.push(this._captureMetricValue(key, metric, metrics));
          } else {
            metrics[key][metric] = null;
          }
        });
      }
      return rsvp.all(promises).then(() => {
        resolve(metrics);
      }).catch(reject);
    });
    return promise;
  }

  getTopMetrics(stat, evalName, total) {
    return this._getGlobalMetrics(stat, evalName, 'last', total);
  }

  getBottomMetrics(stat, evalName, total) {
    return this._getGlobalMetrics(stat, evalName, 'first', total);
  }

  getAllMetrics(stat, evalName) {
    return this._getGlobalMetrics(stat, evalName, 'all');
  }

  getTotal(prop, comparision, value, otherValue) {
    const promise = new rsvp.Promise((resolve) => {
      let query = this.storage.refGameData();
      if (prop) {
        query = query.orderByChild(prop);
        switch (comparision) {
          case 'lesser':
            query = query.endAt(value);
            break;
          case 'greater':
            query = query.startAt(value);
            break;
          case 'between':
            query = query.startAt(value).endAt(otherValue);
            break;
          case 'equal':
            query = query.startAt(value).endAt(value);
            break;
        }
      }
      query.once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  getTotalUsers(stat, evalName, comparision, value, otherValue) {
    const promise = new rsvp.Promise((resolve) => {
      let query = this.storage.refUserData();
      if (stat) {
        const key = this._getStatKey(stat, evalName);
        query = query.orderByChild(key);
        switch (comparision) {
          case 'lesser':
            query = query.endAt(value);
            break;
          case 'greater':
            query = query.startAt(value);
            break;
          case 'between':
            query = query.startAt(value).endAt(otherValue);
            break;
          case 'equal':
            query = query.startAt(value).endAt(value);
            break;
        }
      }
      query.once('value', (snapshot) => {
        resolve(snapshot.numChildren());
      });
    });
    return promise;
  }

  _getGlobalMetrics(stat, evalName, type, total) {
    total = total || 1;
    const key = this._getStatKey(stat, evalName);
    const values = [];
    let query;
    if (type === 'last') {
      query = this.storage.refUserData().orderByChild(key).limitToLast(total);
    } else if (type === 'first') {
      query = this.storage.refUserData().orderByChild(key).limitToFirst(total);
    } else {
      query = this.storage.refUserData().orderByChild(key);
    }
    const promise = new rsvp.Promise((resolve) => {
      query.on('child_added', (snapshot) => {
        values.push(snapshot.child(key).val());
        if (values.length === total) {
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

  _captureMetricValue(stat, evaluatorName, metrics) {
    const key = this._getStatKey(stat, evaluatorName);
    const ref = this.storage.refLoggedInUserData(key);
    const promise = new rsvp.Promise((resolve) => {
      ref.once('value', (snapshot) => {
        const val = snapshot.val();
        if (metrics) {
          metrics[stat][evaluatorName] = val;
        }
        resolve(val);
      });
    });
    return promise;
  }

  _calculateMetricValue(stat, newVal, evaluatorName, evaluator) {
    const key = this._getStatKey(stat, evaluatorName);
    const ref = this.storage.refLoggedInUserData(key);
    const promise = new rsvp.Promise((resolve, reject) => {
      ref.once('value', (snapshot) => {
        const oldVal = snapshot.val();
        if (typeof oldVal === 'undefined') {
          ref.set(newVal).then(resolve).catch(reject);
        } else {
          const evalVal = evaluator(newVal, oldVal);
          if (typeof evalVal !== 'undefined' && evalVal !== null) {
            ref.set(evalVal).then(resolve).catch(reject);
          } else {
            resolve();
          }
        }
      });
    });
    return promise;
  }

  _getStatKey(stat, evalName) {
    return this.storage.name + '~~' + this.storage.mode + '~~' + stat + '~~' + evalName;
  }
}

module.exports = Metrics;
