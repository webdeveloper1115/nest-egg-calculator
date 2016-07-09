/* retiresavefree2.m
 * Jack DeJong's program for bootstrapping retirement savings results:
 * our data consists of monthly returns from January 1970 to December 2013.
 * our bond returns are 10 year Treasury bonds or Merrill Lynch Corporate Bond Index
 * or a fixed rate CD.
 * our diversified stock portfolios assumes that the S&P 500 is 45% of stock,
 * the Russell 2000 is 30% of stock, and the MSCI EAFE Index is 25% of stock,
 * unless you input different percentages.
 * our cash returns use 1 year Treasury bills or a fixed rate money market fund.
 *
 * First the retiree needs to give their 15 inputs to our calculator.
 * We will assume that their cash percentage = 100% - stock% - bond%.
 * Note that lifestyle assumes a constant allocation to stocks.
 * The free version uses 45% large cap equities, 30% small/midcap equities,
 * & 25% international equities.
 */

var Q   = require('q');
var Big = require('big.js');
var rs  = require('../../../lib/app/v3/free/savings');

module.exports = function(value) {
  var defer    = Q.defer();
  var filepath = process.cwd()+'/lib/nest-egg-calculator/test/data/monthlydata1970to2013.txt';
  // --- Value defaults
  // [0] 25       'What is the number of years until you retire?',...
  // [1] 125000   'What is your current annual salary/wages?',...
  // [2] 10       'What is your annual contribution as % of your salary/wages?',...
  // [3] 3        'Select % by which you will increase your contributions each year',...
  // [4] 1        'Estimate your annual investment expenses in percentage',...
  // [5] 1250000  'What is your current retirement portfolio value?',...
  // [6] 50       'What percentage of your retirement portfolio is allocated to stocks?',...
  // [7] 40       'What percentage of your retirement portfolio is allocated to bonds?',...
  // [8] 10       'What percentage of your retirement portfolio is allocated to cash?',...
  // [9] 3        'For bonds select (1) 10 year Treasury bonds (2) US Corporate bonds or (3) CDs',...
  // [10] 1       'What annual fixed percentage rate do you earn on your CDs?',...
  // [11] 2       'For cash select (1) 1 year Treasury bills or (2) Money market fund',...
  // [12] 0       'What annual fixed percentage rate do you earn on your Money market fund?'

  var monthlydata1970to2013;
  rs.readFile(filepath, function(err, _results) {
    monthlydata1970to2013 = _results;

    var inflation = Number(Big(value[3]).div(100).toFixed(15)),
        expense = Number(Big(value[4]).div(100).toFixed(15)),
        bondwt = Number(Big(value[7]).div(100).toFixed(15)),
        stockwt = Big(value[6]).div(100),
        sp500wt = Number(stockwt.times(45/100).toFixed(15)),
        russwt = Number(stockwt.times(30/100).toFixed(15)),
        eafewt = Number(stockwt.times(25/100).toFixed(15)),
        cashwt = Number(Big(value[8]).div(100).toFixed(15)),
        originalmoinvestamt = Number(Big(value[2]).div(100).times(Big(value[1]).div(12)).toFixed(15)),
        years = value[0],
        horizon = years * 12,
        originalbal = value[5],
        nboot = 5000,
        results = new Array(nboot),
        bootsam = new Array(1056),
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


        // %Need to append inputted CD and Money market fund inputted rates to the
        // %monthly data file:
        for (var i = 0; i < 1056; i++) {
          monthlydata1970to2013[i][8] = Number(Big(value[10]).div(1200)); // %converts input CD annual rate to a monthly rate
          monthlydata1970to2013[i][9] = Number(Big(value[12]).div(1200)); // %converts input MMF annual rate to a monthly
        }

        // %Assign which bond investment will be used based on inputs:
        var bf;
        if (value[9] === 2) { // %selected Merrill Lynch US Corporate Bond Index
          bf = 3; // %ML US Corporate Bond returns in column 4 (index 3)
        }
        else if (value[9] === 3) { // %selected CD with user inputted fixed rate
          bf = 8; // %user input CD fixed rate in column 9 (index 8)
        }
        else { // %selected 1 for 10 year Treasury bonds
          bf = 2; // %10 year Treasury Bond returns in column 3 (index 2)
        }

        // %Assign which cash fund investment will be used based on inputs:
        var cf;
        if (value[11] === 2) { // %selected MMF with user inputted fixed rate
          cf = 9; // %user input MMF fixed rate in column 10 (index 9)
        }
        else { //%selected 1 for 1 year Treasury bills
          cf = 7; // %1 year Treasury Bill returns in column 8 (index 7)
        }

        // Convert to number
        stockwt = Number(stockwt.toFixed(15));

        // Initialize arrays with zeroes.
        // Remove this if it's unecessary.
        results = fill(results, 0);

        bootsam = fill(bootsam, function() {
                return fill(new Array(nboot), function() {
                       return Math.floor(Math.random() * 1056);
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

        dataset = monthlydata1970to2013[bootsam[mn][bs]];
        bondbal = (bondbal + moinvestamt * bondwt) * (1 + dataset[bf]);
        sp500bal = (sp500bal + moinvestamt * sp500wt) * (1 + dataset[3]);
        russbal = (russbal + moinvestamt * russwt) * (1 + dataset[4]);
        eafebal = (eafebal + moinvestamt * eafewt) * (1 + dataset[5]);
        cashbal = (cashbal + moinvestamt * cashwt) * (1 + dataset[cf]);

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
    
    accumtable['80th Percentile Balance'] = quantile(results, 0.8).toExponential();
    accumtable['60th Percentile Balance'] = quantile(results, 0.6).toExponential();
    // accumtable['Mean Balance']            = mean(results).toExponential();
    accumtable['Median Balance']          = quantile(results, 0.5).toExponential();
    accumtable['40th Percentile Balance'] = quantile(results, 0.4).toExponential();
    accumtable['20th Percentile Balance'] = quantile(results, 0.2).toExponential();
    accumtable['Lowest Balance']          = results[0].toExponential();

    keytable['Highest Balance']                         = results[results.length - 1].toExponential();
    keytable['Balance at End of Year']                  = years;
    keytable['Number of Years until Retirement']        = years;
    keytable['Average Annual Retirement Contribution']  = (Big(cumcontribute).div(years)).toExponential();
    keytable['Total Contributions at Retirement']       = (cumcontribute).toExponential();
    keytable['Best Case: Maximum Accumulated Balance']  = keytable['Highest Balance'];
    keytable['Worst Case: Minimum Accumulated Balance'] = accumtable['Lowest Balance'];

    defer.resolve({
      accumtable: accumtable,
      keytable: keytable,
    });

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
