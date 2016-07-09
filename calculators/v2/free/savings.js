/* retiresave.m
 * Jack DeJong's program for bootstrapping retirement savings results:
 * our data consists of monthly returns from January 1970 to December 2010.
 * our bond returns are 10 year Treasury bonds.
 * our diversified stock portfolios assumes that the S&P 500 is 45% of stock,
 * the Russell 2000 is 30% of stock, and the MSCI EAFE Index is 25% of stock.
 * our cash returns use 1 year Treasury bills.
 */

var Q   = require('q');
var Big = require('big.js');
var rs  = require('../../../lib/app/v2/free/savings');


module.exports = function(value, filepath, callback) {
  var defer = Q.defer();
  var monthlydata1970to2010;

  rs.readFile(filepath, function(err, _results) {
    monthlydata1970to2010 = _results;

    var inflation = Number(Big(value[3]).div(100).toFixed(15)),
        expense = Number(Big(value[4]).div(100).toFixed(15)),
        bondwt = Number(Big(value[7]).div(100).toFixed(15)),
        stockwt = Big(value[6]).div(100),
        sp500wt = Number(stockwt.times(0.45).toFixed(15)),
        russwt = Number(stockwt.times(0.3).toFixed(15)),
        eafewt = Number(stockwt.times(0.25).toFixed(15)),
        cashwt = Number(Big(value[8]).div(100).toFixed(15)),
        originalmoinvestamt = Number(Big(value[2]).div(100).times(Big(value[1]).div(12)).toFixed(15)),
        years = value[0],
        horizon = years * 12,
        originalbal = value[5],
        nboot = 5000,
        results = new Array(nboot),
        bootsam = new Array(984),
        i, j,
        bs, balance, moinvestamt, mn, dataset,
        bondbal = 0,
        sp500bal = 0,
        russbal = 0,
        eafebal = 0,
        cashbal = 0,
        cumcontribute, kk, anninvestamt,
        accumtable = {},
        keytable = {};


        // Convert to number
        stockwt = Number(stockwt.toFixed(15));

        // Initialize arrays with zeroes.
        // Remove this if it's unecessary.
        results = fill(results, 0);

        bootsam = fill(bootsam, function() {
                return fill(new Array(nboot), function() {
                       return Math.floor(Math.random() * 984);
                });
        });

    for (bs = 0; bs < nboot; bs++) {
      balance = originalbal;
      moinvestamt = originalmoinvestamt;
      for (mn = 0; mn < horizon; mn++) {
        if (mn % 12 === 0) {
          bondbal = bondwt * balance;
          sp500bal = sp500wt * balance;
          russbal = russwt * balance;
          eafebal = eafewt * balance;
          cashbal = cashwt * balance;
        }

        dataset = monthlydata1970to2010[bootsam[mn][bs]];
        bondbal = (bondbal + moinvestamt * bondwt) * (1 + dataset[1]);
        sp500bal = (sp500bal + moinvestamt * sp500wt) * (1 + dataset[2]);
        russbal = (russbal + moinvestamt * russwt) * (1 + dataset[3]);
        eafebal = (eafebal + moinvestamt * eafewt) * (1 + dataset[4]);
        cashbal = (cashbal + moinvestamt * cashwt) * (1 + dataset[5]);

        balance = Number((bondbal + sp500bal + russbal + eafebal + cashbal).toFixed(15));

        if (mn % 12 === 11) {
          balance = Number(Big(balance).times(1 - expense).toFixed(15));
          moinvestamt = Number(Big(moinvestamt).times(1 + inflation).toFixed(15));
        }
      }

      results[bs] = balance;

    }

    // Ascending order
    results.sort(ascendingOrder);

    cumcontribute = 0;

    for(kk = 1; kk <= years; kk++) {
      anninvestamt = Number((Big(1 + inflation).pow(kk - 1)).times(originalmoinvestamt * 12)); // checkout the exponential components here
      cumcontribute += anninvestamt;
    }

    accumtable['Balance at End of Year'] = years;
    accumtable['Highest Balance'] = results[results.length - 1].toExponential();
    accumtable['80th Percentile Balance'] = quantile(results, 0.8).toExponential();
    accumtable['60th Percentile Balance'] = quantile(results, 0.6).toExponential();
    accumtable['Mean Balance'] = mean(results).toExponential();
    accumtable['Median Balance'] = quantile(results, 0.5).toExponential();
    accumtable['40th Percentile Balance'] = quantile(results, 0.4).toExponential();
    accumtable['20th Percentile Balance'] = quantile(results, 0.2).toExponential();
    accumtable['Lowest Balance'] = results[0].toExponential();

    keytable['Number of Years until Retirement'] = years;
    keytable['Average Annual Retirement Contribution'] = (Big(cumcontribute).div(years)).toExponential();
    keytable['Total Contributions at Retirement'] = (cumcontribute).toExponential();
    keytable['Best Case: Maximum Accumulated Balance'] = accumtable['Highest Balance'];
    keytable['Worst Case: Minimum Accumulated Balance'] = accumtable['Lowest Balance'];

    defer.resolve({ accumtable: accumtable, keytable: keytable });
  });

  return defer.promise;
};

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

function ascendingOrder(a, b) {
  return a - b;
}

function fill(array, value) {
  var i;
  for (i = 0; i < array.length; i++) {
    array[i] = (typeof value === 'function') ? value() : value;
  }
  return array;
}
