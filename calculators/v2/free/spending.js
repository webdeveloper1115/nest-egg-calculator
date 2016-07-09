/* retiresave.m
 * Jack DeJong's program for bootstrapping retirement savings results:
 * our data consists of monthly returns from January 1970 to December 2010.
 * our bond returns are 10 year Treasury bonds.
 * our diversified stock portfolios assumes that the S&P 500 is 45% of stock,
 * the Russell 2000 is 30% of stock, and the MSCI EAFE Index is 25% of stock.
 * our cash returns use 1 year Treasury bills.
 */

var rg = require('../../../lib/app/v2/free/spending'),

    // This library is very crutial for math precision in this project.
    Big = require('big.js');

module.exports = function(value, filepath, callback) {

  var monthlydata1970to2010;

  rg.readFile(filepath, function(err, _results) {
    monthlydata1970to2010 = _results;

    var inflation = Number(Big(value[3]).div(100).toFixed(15)),
        expense = Number(Big(value[4]).div(100).toFixed(15)),
        bondwt = Number(Big(value[6]).div(100).toFixed(15)),
        stockwt = Big(value[5]).div(100),
        sp500wt = Number(stockwt.times(0.45).toFixed(15)),
        russwt = Number(stockwt.times(0.3).toFixed(15)),
        eafewt = Number(stockwt.times(0.25).toFixed(15)),
        cashwt = Number(Big(value[7]).div(100).toFixed(15)),
        originalwithdrawamt = Number(Big(value[2]).toFixed(15)),
        horizon = value[1] * 12,
        originalbal = value[0],
        nboot = 5000,
        results = new Array(11),
        bootsam = new Array(984),
        i, j,
        bs, balance, mofailed, withdrawamt, mn, dataset,
        bondbal = 0,
        sp500bal = 0,
        russbal = 0,
        eafebal = 0,
        cashbal = 0,
        failyrs, numfailyrs, probfailyrs, probsuccessyrs,
        meanmofailyrs, stdmofailyrs,
        minmofailyrs, maxmofailyrs, minyearsfail, maxbal,
        rbtable = {}, period, row,
        keytable = {}, yrcount,
        incometable, cumincome, annincome;

      // Convert to number
      stockwt = Number(stockwt.toFixed(15));

      // Initialize arrays with zeroes.
      // Remove this if it's unecessary.
      results = fill(results, function() { return fill(new Array(nboot), 0);});

      results[0] = fill(results[0], 600);

      bootsam = fill(bootsam, function() {
                return fill(new Array(nboot), function() {
                       return Math.floor(Math.random() * 984);
                });
      });

    for (bs = 0; bs < nboot; bs++) {
      balance = originalbal;
      mofailed = 600;
      withdrawamt = originalwithdrawamt;

      for (mn = 0; mn < horizon; mn++) {
        dataset = monthlydata1970to2010[bootsam[mn][bs]];

        if (mofailed < 600) {
          break;
        }

        if (mn % 12 === 0) {
          balance = balance - withdrawamt;

          if (balance > 0) {
            bondbal = bondwt * balance;
            sp500bal = sp500wt * balance;
            russbal = russwt * balance;
            eafebal = eafewt * balance;
            cashbal = cashwt * balance;
          }
          else {
            mofailed = (mn-1) + fix((balance + withdrawamt) / (withdrawamt / 12));
            results[0][bs] = mofailed;
            break;
          }
        }

        bondbal = bondbal * (1 + dataset[1]);
        sp500bal = sp500bal * (1 + dataset[2]);
        russbal = russbal * (1 + dataset[3]);
        eafebal = eafebal * (1 + dataset[4]);
        cashbal = cashbal * (1 + dataset[5]);
        balance = Number((bondbal + sp500bal + russbal + eafebal + cashbal).toFixed(15));


        if (mn % 12 === 11) {
          withdrawamt = Number(Big(withdrawamt).times(1 + inflation).toFixed(15));
          balance = Number(Big(balance).times(1 - expense).toFixed(15));
        }

        if (mn >= 59 && mn % 60 == 59) {
          results[Math.floor(mn/60) + 1][bs] = balance;
        }
      }
    }

    failyrs = results[0].filter(function(v) {
                return v < horizon;
              });

    numfailyrs = failyrs.length;
    probfailyrs = numfailyrs / nboot;
    probsuccessyrs = (nboot - numfailyrs) / nboot;

    meanmofailyrs = mean(failyrs);
    stdmofailyrs = std(failyrs);
    minmofailyrs = Math.min.apply(null, failyrs);
    maxmofailyrs = Math.max.apply(null, failyrs);

    rbtable['Highest Balance'] = [];
    rbtable['80th Percentile Balance'] = [];
    rbtable['60th Percentile Balance'] = [];
    rbtable['Mean Balance'] = [];
    rbtable['Median Balance'] = [];
    rbtable['40th Percentile Balance'] = [];
    rbtable['20th Percentile Balance'] = [];
    rbtable['Lowest Balance'] = [];

    for(i = 1; i < results.length; i++) {
      row = results[i].sort(ascendingOrder);
      rbtable['Highest Balance'].push(quantile(row, 1.0).toExponential());
      rbtable['80th Percentile Balance'].push(quantile(row, 0.8).toExponential());
      rbtable['60th Percentile Balance'].push(quantile(row, 0.6).toExponential());
      rbtable['Mean Balance'].push(mean(row).toExponential());
      rbtable['Median Balance'].push(quantile(row, 0.5).toExponential());
      rbtable['40th Percentile Balance'].push(quantile(row, 0.4).toExponential());
      rbtable['20th Percentile Balance'].push(quantile(row, 0.2).toExponential());
      rbtable['Lowest Balance'].push(row[0].toExponential());
    }

    yrcount = horizon / 12;

    maxbal = Math.max.apply(null, results.reduce(flatten));

    keytable['Number of Years in Retirement Horizon'] = yrcount;
    keytable['Probability of Success in Horizon Period'] = probsuccessyrs;
    keytable['Maximum Remaining Balance'] = maxbal.toExponential();
    keytable['Percentage of Time Savings Failed'] = probfailyrs;
    minyearsfail = minmofailyrs / 12;
    keytable['Worst Case: Savings Depleted in Years'] = minyearsfail;

    incometable = {'Annual Income with C.O.L.A.': [],
                   'Cumulative Retirement Income': []};

    cumincome = 0;

    for (kk = 0; kk < yrcount; kk++) {
      annincome = originalwithdrawamt * Number((Big(1 + inflation).pow(kk - 1)));
      incometable['Annual Income with C.O.L.A.'][kk] = annincome.toExponential();
      cumincome += annincome;
      incometable['Cumulative Retirement Income'][kk] = cumincome.toExponential();
    }

    // Return results to callback;
    callback({
      rbtable: rbtable,
      keytable: keytable,
      incometable: incometable
    });

  });

};

function fix(value) {
  if (value > 0) {
    return Math.floor(value);
  }
  else {
    return Math.ceil(value);
  }
}

function quantile(values, p) {
  var H = (values.length - 1) * p + 1,
      h = Math.floor(H),
      v = +values[h - 1],
      e = H - h;
  return e ? v + e * (values[h] - v) : v;
}

function mean(values) {
  return values.reduce(sum, 0) / values.length;
}

function sum(total, value) {
  return total + value;
}

function std(values, index) {
  var _mean = mean(values),
      _std = 0;

  for (var i = 0; i < values.length; i++) {
    _std += Math.pow(values[i] - _mean, 2);
  }

  return _std;
}

function ascendingOrder(a, b) {
  return a - b;
}

function flatten(a, b) {
  return a.concat(b);
}

function maxValue(max, array) {
  if (max >= array[0]) {
    return max;
  }
  else {
    return array[0];
  }
}

function fill(array, value) {
  var i;
  for (i = 0; i < array.length; i++) {
    array[i] = (typeof value === 'function') ? value() : value;
  }
  return array;
}
