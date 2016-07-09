This contains 4 calculators for the Nest Egg Guru project:
  - Free
    - saving
    - spending
  - Premium
    - saving
    - spending

Inteded usage:

```javascript
  // Select a specific calculator
  var freeSpending = require('nest-egg-calculator').free.spending;
  var freeSpending = require('./index.js').free.saving;

  /**
   * `values` an array of values to use as input
   * `filepath` a csv file containing seed data for the calculator to use
   * `callback` is a function to be executed after calculations are made.
   * Note: The first argument is a result object containing the keys:
   *   - keytable
   *   - accumtable (saving)
   *   - incometable (spending)
   *   - rbtable (spending)
   */
  var values = [25,50000,10,7,0.25,50000,50,40,10],
      filepath = 'test/data/monthlydata1970to2010.txt',
      callback = function handleResults (results) {
                   console.log(results);
                 };
  freeSpending(values, filepath, callback);
```
