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
    this.addEvaluator('add', (newVal, oldVal) => oldVal + newVal);
    this.addEvaluator('sub', (newVal, oldVal) => oldVal - newVal);
    this.addEvaluator('mul', (newVal, oldVal) => oldVal * newVal);
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
            promises.push(this._getMetricValue(key, metric).then((val) => {
              metrics[key][metric] = val;
            }));
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
    return _getGlobalMetrics(stat, evalName, 'last', total);
  }

  getBottomMetrics(stat, evalName, total) {
    return _getGlobalMetrics(stat, evalName, 'first', total);
  }

  getAllMetrics(stat, evalName) {
    return _getGlobalMetrics(stat, evalName, 'all');
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

  _getMetricValue(stat, evaluatorName) {
    const key = this._getStatKey(stat, evaluatorName);
    const ref = this.storage.refLoggedInUserData(key);
    const promise = new rsvp.Promise((resolve) => {
      ref.once('value', (snapshot) => {
        resolve(snapshot.val());
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
