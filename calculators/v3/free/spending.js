/* retiregurufree2.m
 * Jack DeJong's program for bootstrapping retirement withdrawal results:
 * This is our updated version incorporating newer data and more choices.
 * our data consists of monthly returns from January 1970 to December 2013.
 * our bond returns are 10 year Treasury bonds or Merrill Lynch Corporate Bond Index
 * or a fixed rate CD.
 * our diversified stock portfolios assumes that the S&P 500 is 45% of stock,
 * the Russell 2000 is 30% of stock, and the MSCI EAFE Index is 25% of stock.
 * our cash returns use 1 year Treasury bills or a fixed rate money market fund.
 *
 * First the retiree needs to give their 12 inputs to our calculator.
 * We will assume that their cash percentage = 100% - stock% - bond%.
 * Free calculator assumes withdrawal strategy = annual rebalancing.
 */

var Q   = require('q');
var rg  = require('../../../lib/app/v3/free/spending');
var Big = require('big.js');

module.exports = function(value) {
  var defer    = Q.defer();
  var filepath = process.cwd()+'/lib/nest-egg-calculator/test/data/monthlydata1970to2013.txt';
  // --- Value defaults
  // [0] 250000   'What is the present value of your retirement savings?',...
  // [1] 30       'Select the number of years over which your money needs to last',...
  // [2] 15000    'What is your anticipated initial annual withdrawal amount?',...
  // [3] 3        'Select an annual cost of living adjustment percentage',...
  // [4] 1        'Estimate your annual investment expenses in percentage',...
  // [5] 50       'What percentage of your retirement portfolio is allocated to stocks?',...
  // [6] 40       'What percentage of your retirement portfolio is allocated to bonds?',...
  // [7] 10       'What percentage of your retirement portfolio is allocated to cash?',...
  // [8] 3        'For bonds select (1) 10 year Treasury bonds (2) US Corporate bonds or (3) CDs',...
  // [9] 1        'What annual fixed percentage rate do you earn on your CDs?',...
  // [10] 2       'For cash select (1) 1 year Treasury bills or (2) Money market fund',...
  // [11] 0       'What annual fixed percentage rate do you earn on your Money market fund?'

  var monthlydata1970to2013;

  rg.readFile(filepath, function(err, _results) {
    monthlydata1970to2013 = _results;

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
        bootsam = new Array(1056),
        i, j,
        bs, balance, mofailed, withdrawamt, mn, dataset,
        bondbal = 0,
        sp500bal = 0,
        russbal = 0,
        eafebal = 0,
        cashbal = 0,
        failyrs, numfailyrs, probfailyrs, probsuccessyrs,
        meanmofailyrs, stdmofailyrs,
        minmofailyrs, maxmofailyrs, minyearsfail, depletedYears, maxbal,
        rbtable = {}, period, row,
        keytable = {}, yrcount,
        incometable, cumincome, annincome;


        // %Need to append inputted CD and Money market fund inputted rates to the
        // %monthly data file:
        for (var i = 0; i < 1056; i++) {
          monthlydata1970to2013[i][8] = Number(Big(value[9]).div(1200)); // %converts input CD annual rate to a monthly rate
          monthlydata1970to2013[i][9] = Number(Big(value[11]).div(1200)); // %converts input MMF annual rate to a monthly rate
        }

        // %Assign which bond investment will be used based on inputs:
        var bf;
        if (value[8] === 2) { // %selected Merrill Lynch US Corporate Bond Index
          bf = 3; // %ML US Corporate Bond returns in column 4 (index 3)
        }
        else if (value[8] === 3) { // %selected CD with user inputted fixed rate
          bf = 8; // %user input CD fixed rate in column 9 (index 8)
        }
        else { // %selected 1 for 10 year Treasury bonds
          bf = 2; // %10 year Treasury Bond returns in column 3 (index 2)
        }

        // %Assign which cash fund investment will be used based on inputs:
        var cf;
        if (value[10] === 2) { // %selected MMF with user inputted fixed rate
          cf = 9; // %user input MMF fixed rate in column 10 (index 9)
        }
        else { //%selected 1 for 1 year Treasury bills
          cf = 7; // %1 year Treasury Bill returns in column 8 (index 7)
        }


      // Convert to number
      stockwt = Number(stockwt.toFixed(15));

      // Initialize arrays with zeroes.
      // Remove this if it's unecessary.
      results = fill(results, function() { return fill(new Array(nboot), 0);});

      results[0] = fill(results[0], 600);

      bootsam = fill(bootsam, function() {
                return fill(new Array(nboot), function() {
                       return Math.floor(Math.random() * 1056);
                });
      });

    for (bs = 0; bs < nboot; bs++) {
      balance = originalbal;
      mofailed = 600;
      withdrawamt = originalwithdrawamt;

      for (mn = 0; mn < horizon; mn++) {
        dataset = monthlydata1970to2013[bootsam[mn][bs]];

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

        bondbal = bondbal * (1 + dataset[bf]);
        sp500bal = sp500bal * (1 + dataset[3]);
        russbal = russbal * (1 + dataset[4]);
        eafebal = eafebal * (1 + dataset[5]);
        cashbal = cashbal * (1 + dataset[cf]);
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

    numfailyrs     = failyrs.length;
    probfailyrs    = numfailyrs / nboot;
    probsuccessyrs = (nboot - numfailyrs) / nboot;

    meanmofailyrs = mean(failyrs);
    stdmofailyrs  = std(failyrs);
    minmofailyrs  = Math.min.apply(null, failyrs);
    maxmofailyrs  = Math.max.apply(null, failyrs);

    // rbtable['Highest Balance'] = [];
    rbtable['Lowest Balance']          = [];
    rbtable['20th Percentile Balance'] = [];
    rbtable['40th Percentile Balance'] = [];
    rbtable['Median Balance']          = [];
    rbtable['60th Percentile Balance'] = [];
    rbtable['80th Percentile Balance'] = [];
    // rbtable['Mean Balance']            = [];

    for(i = 1; i < results.length; i++) {
      row = results[i].sort(ascendingOrder);
      // rbtable['Highest Balance'].push(row[row.length - 1].toExponential());
      rbtable['80th Percentile Balance'].push(quantile(row, 0.8).toExponential());
      rbtable['60th Percentile Balance'].push(quantile(row, 0.6).toExponential());
      // rbtable['Mean Balance'].push(mean(row).toExponential());
      rbtable['Median Balance'].push(quantile(row, 0.5).toExponential());
      rbtable['40th Percentile Balance'].push(quantile(row, 0.4).toExponential());
      rbtable['20th Percentile Balance'].push(quantile(row, 0.2).toExponential());
      rbtable['Lowest Balance'].push(row[0].toExponential());
    }

    yrcount = horizon / 12;
    var k = Math.floor(yrcount / 5); // results for horizon years stored in row k of results matrix.
    maxbal = Math.max.apply(null, results[k]);

    keytable['Number of Years in Retirement Horizon'] = yrcount;
    keytable['Probability of Success in Horizon Period'] = probsuccessyrs;
    keytable['Maximum Remaining Balance'] = maxbal.toExponential();
    keytable['Percentage of Time Savings Failed'] = probfailyrs;

    minyearsfail = minmofailyrs / 12;
    depletedYears = results[0].sort(ascendingOrder);
    keytable['Worst Case: Savings Depleted in Years'] = minyearsfail;
    keytable['Best Case: Savings Depleted in Years'] = quantile(depletedYears, 1.0).toExponential() / 12;
    keytable['80th Percentile: Savings Depleted in Years'] = quantile(depletedYears, 0.8).toExponential() / 12;
    keytable['60th Percentile: Savings Depleted in Years'] = quantile(depletedYears, 0.6).toExponential() / 12;
    keytable['Mean: Savings Depleted in Years'] = mean(depletedYears).toExponential() / 12;
    keytable['Median: Savings Depleted in Years'] = quantile(depletedYears, 0.5).toExponential() / 12;
    keytable['40th Percentile: Savings Depleted in Years'] = quantile(depletedYears, 0.4).toExponential() / 12;
    keytable['20th Percentile: Savings Depleted in Years'] = quantile(depletedYears, 0.2).toExponential() / 12;

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
    defer.resolve({
      rbtable: rbtable,
      keytable: keytable,
      incometable: incometable
    });

  });

  return defer.promise;
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
