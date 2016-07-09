/* retiresave2.m Jack DeJong's program for bootstrapping retirement savings results:
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
 * Note that lifestyle assumes a constant allocation to stocks and
 * lifecycle uses a linear glidepath to reduce the allocation to
 * stocks evenly each year.
 * After selecting the percentage allocations for small/midcap equities and
 * international equities, the balance of your stocks will be allocated to large cap US equities.
 */

var rs = require('../../../lib/app/v2/premium/savings'),

    // This library is very crutial for math precision in this project.
    Big = require('big.js');

module.exports = function(value, filepath, callback) {

  var monthlydata1970to2013;
  rs.readFile(filepath, function(err, _results) {
    monthlydata1970to2013 = _results;

    // Set critical inputs:
    var inflation = Number(Big(value[3]).div(100).toFixed(15)), //input the annual cost of living adjustment for inflation.
        expense = Number(Big(value[4]).div(100).toFixed(15)), //input the annual investment expenses as given by the retiree.
        originalbondwt = Number(Big(value[8]).div(100).toFixed(15)), //input the portion of the portfolio that is invested in bonds.
        stockwt = Big(value[6]).div(100), //input the portion of the portfolio that is invested in stocks.
        stockwtretire = Number(Big(value[7]).div(100).toFixed(15)), //input the portion of the portfolio that is invested in stocks at retirement.
        // TODO: Check if this should default to 0.45 (45%);
        sp500wt = Number(stockwt.times((Big(100 - value[9] - value[10]).div(100))).toFixed(15)), //45% or input amount of stock portion is invested in S&P 500.
        russwt = Number(stockwt.times(Big(value[9]).div(100)).toFixed(15)), //30% or input amount of stock portion is invested in Russell 2000.
        eafewt = Number(stockwt.times(Big(value[10]).div(100)).toFixed(15)), //25% or input amount of stock portion is invested in MSCI EAFE Index.
        cashwt = Number(Big(1 - originalbondwt).minus(stockwt).toFixed(15)), //remaining percentage of portfolio is invested in 1 year Treasury bills.
        originalmoinvestamt = Number(Big(value[2]).div(100).times(Big(value[1]).div(12).toFixed(15))), //set to withdraw retirees target initial annual withdrawal.
        years = value[0], //years = number of years to retirement as inputted by retiree.
        horizon = years * 12, //retirement horizon set in number of months with years given by retiree.
        glide = (stockwt - stockwtretire) / (years - 1), //glide=0 for lifestyle accumulation with constant stock allocation, and glide = annual linear
        // %adjustement of lifecycle's accumulation linear glidepath with an even
        // %decrease each year in the percent of stock and increase each year in the
        // %percent of bonds.  Assumed that cash percent stays constant each year.
        originalbal = value[5], //set originbal to the current value in the retirement portfolio.
        nboot=5000; //nboot is the number of bootstrapping samples to generate.
        // % preallocate memory for our output file of results:
        results = new Array(nboot); //results matrix is where we will store the target date retirement portfolio balances for each bootstrap sample.
        // savefile='filesavings'; %name the file to save the workspace variables.

        stockwt = Number(stockwt);

    // %Need to append inputted CD and Money market fund inputted rates to the
    // %monthly data file:
    for (var i = 0; i < 1056; i++) {
      monthlydata1970to2013[i][8] = Number(Big(value[12]).div(1200)); //%converts input CD annual rate to a monthly rate
      monthlydata1970to2013[i][9] = Number(Big(value[14]).div(1200)); //%converts input MMF annual rate to a monthly rate
    }

    // %Assign which bond investment will be used based on inputs:
    var bf;
    if (value[11] == 2) { // %selected Merrill Lynch US Corporate Bond Index
      bf = 3; //ML US Corporate Bond returns in column 4 (index 3)
    }
    else if (value[11] == 3) { // %selected CD with user inputted fixed rate
      bf = 8; // %user input CD fixed rate in column 9 (index 8)
    }
    else { // %selected 1 for 10 year Treasury bonds
      bf = 2; // %10 year Treasury Bond returns in column 3 (index 2)
    }

    // %Assign which cash fund investment will be used based on inputs:
    var cf;
    if (value[13] == 2) { // %selected MMF with user inputted fixed rate
      cf = 9; // %user input MMF fixed rate in column 10 (index 9)
    }
    else { //%selected 1 for 1 year Treasury bills
      cf = 7; // %1 year Treasury Bill returns in column 8 (index 7)
    }

    // %Generate the bootstrapping samples of returns for the selected horizon:
    // %Since our time series has 528 months of data from 1970 to 2013, we doubled
    // %the number of months to 1056 by listing each month twice to allow for
    // %retirement horizons that are longer than 44 years.  bootsam
    // %generates 1056 randomly selected months for each bootstrapping sample.  We
    // %will use the first 120 rows for 10 years, the first 360 rows for 30 years
    // %etc.  This way we can check each random sample to see what is accumulated
    // %in the target number of years.  Each column in bootsam
    // %represents a sample, so for nboot=1000, bootsam will have 1000 columns and
    // %1056 rows.
    bootsam = new Array(1056);

    // Initialize arrays with zeroes.
    // Remove this if it's unecessary.
    results = fill(results, 0);

    // generates 1056 x nboot matrix of integers with imax = 1055 for 1055 months of data.
    bootsam = fill(bootsam, function() {
            return fill(new Array(nboot), function() {
                   return Math.floor(Math.random() * 1056);
            });
    });

    // %Assume annual rebalancing to our target proportions.  Assume at the
    // %beginning of each month we add our monthly investment amount which is
    // %growing annually at our inputted rate of increase.
    // %Loop over the nboot number of bootstrap samples by our bs column index:
    var bondbal,
        sp500bal,
        russbal,
        eafebal,
        cashbal;
    for (var bs = 0; bs < nboot; bs++) { // %nboot is the number of bootstrap samples we want.
      var balance = originalbal, // %start each bootstrap sample with inputted dollars in retirement portfolio.
          moinvestamt = originalmoinvestamt, // %start each bootstrap sample with same monthly investment amount.
          bondwt= originalbondwt; //%start each bootstrap sample with the selected percentage in bonds before any glidepath adjustment
      for (var mn = 0; mn < horizon; mn++) { // %maximum horizon considered is 50 years or 600 months, but it can be shorter as inputted.
        if (mn % 12 === 0) { // %Identified first month of year so rebalance.
          bondbal = bondwt * balance; // %rebalance bond portfolio to have target weight.
          sp500bal = sp500wt * balance; // %rebalance S&P 500 portfolio to have target weight.
          russbal = russwt * balance; // %rebalance Russell 2000 portfolio to have target weight.
          eafebal = eafewt * balance; // %rebalance EAFE Index portfolio to have target weight.
          cashbal = cashwt * balance; // %rebalance the 1 year Treasury bill cash fund to have the target weight.
        }
        // %make monthly investment as adjusted for inflation and update portfolio balances
        bondbal = (bondbal+moinvestamt*bondwt)*(1+monthlydata1970to2013[bootsam[mn][bs]][bf]);
        sp500bal = (sp500bal+moinvestamt*sp500wt)*(1+monthlydata1970to2013[bootsam[mn][bs]][3]);
        russbal = (russbal+moinvestamt*russwt)*(1+monthlydata1970to2013[bootsam[mn][bs]][4]);
        eafebal = (eafebal+moinvestamt*eafewt)*(1+monthlydata1970to2013[bootsam[mn][bs]][5]);
        cashbal = (cashbal+moinvestamt*cashwt)*(1+monthlydata1970to2013[bootsam[mn][bs]][cf]);
        balance = Number(bondbal + sp500bal + russbal + eafebal + cashbal).toFixed(15);

        if (mn % 12 === 11) { // %identified 12th month of year so update inflation and deduct fees for the year.
          balance = Number(Big(balance).times(1 - expense).toFixed(15)); // %reduce balance by annual investment fees
          moinvestamt = Number(Big(moinvestamt).times(1 + inflation).toFixed(15)); // %update next year's monthly investment amount for inflation
          bondwt=bondwt+glide; // %move down glidepath of lifecycle fund; increase bond weight and decrease stock weight by glide%;
          // %note that glide% is 0% for lifestyle funds with constant
          // %bond:stock allocation.
          var _stockwt = Big(1-bondwt-cashwt);
          sp500wt = Number(_stockwt.times((Big(100 - value[9] - value[10]).div(100))).toFixed(15)); // %fixed portion of stocks is invested in S&P 500.
          russwt = Number(_stockwt.times(Big(value[9]).div(100))); // %fixed portion of stocks is invested in Russell 2000.
          eafewt = Number(_stockwt.times(Big(value[10]).div(100))); // %fixed portion of stocks is invested in MSCI EAFE Index.
          // %note that rebalancing to target weights will happen in the
          // %first month before any investments are added.
        }
      }
    // %done with updating monthly returns
      results[bs] = balance; // %store retirement portfolio balance after targeted number of years for each bootstrap sample.
    }

    // Ascending order
    results.sort(ascendingOrder);

    // %Compute the statistics for the output including average and total
    // %contributions plus percentile accumulated balances at retirement.
    // %First find number of failures and statistics by horizon period:
    // %First compute the projected retirement contributions average and total;
    // %note that the inflation rate and annual retirement contribution are both input
    // %by the retiree using the calculator and so neither vary from bootstrap to
    // %bootstrap sample.
    var cumcontribute = 0; // %start with no cumulative contributions.
    for(kk = 1; kk <= years; kk++) {
      var anninvestamt = Number((Big(1 + inflation).pow(kk - 1)).times(originalmoinvestamt * 12)); // checkout the exponential components here
      cumcontribute += anninvestamt;
    } // %done with the projected retirement contribution calculations.

    var accumtable = {},
        keytable = {};

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
    keytable['Average Annual Retirement Contribution'] = (cumcontribute / years).toExponential();
    keytable['Total Contributions at Retirement'] = (cumcontribute).toExponential();
    keytable['Best Case: Maximum Accumulated Balance'] = accumtable['Highest Balance'];
    keytable['Worst Case: Minimum Accumulated Balance'] = accumtable['Lowest Balance'];
    keytable['10% Value at Risk'] = quantile(results, 0.1).toExponential();
    keytable['5% Value at Risk'] = quantile(results, 0.05).toExponential();
    keytable['1% Value at Risk'] = quantile(results, 0.01).toExponential();

    callback({
      accumtable: accumtable,
      keytable: keytable,
    });
  });
};

// %Second find percentile accumulated balances at retirement:
// %Save the accumulated balances in a 9 x 11 Table
// clear accumtable; %clear workspace for remaining balances table which will be 9 rows and 2 columns:
// accumtable(1,1)={'Balance at End of Year'};
// accumtable(2,1)={'Highest Balance'};
// accumtable(3,1)={'80th Percentile Balance'};
// accumtable(4,1)={'60th Percentile Balance'};
// accumtable(5,1)={'Mean Balance'};
// accumtable(6,1)={'Median Balance'};
// accumtable(7,1)={'40th Percentile Balance'};
// accumtable(8,1)={'20th Percentile Balance'};
// accumtable(9,1)={'Lowest Balance'};
// accumtable(1,2)={years};
// %The inputted years to retirement period is the only accumulation period
// %evaluated.  The initial retirement portfolio balance was inputted.
// accumtable(2,2)={quantile(results(1,:),1.00)};
// accumtable(3,2)={quantile(results(1,:),.80)};
// accumtable(4,2)={quantile(results(1,:),.60)};
// accumtable(5,2)={mean(results(1,:))};
// accumtable(6,2)={quantile(results(1,:),.50)};
// accumtable(7,2)={quantile(results(1,:),.40)};
// accumtable(8,2)={quantile(results(1,:),.20)};
// accumtable(9,2)={quantile(results(1,:),0)};
// %Save the key results in an 8 x 2 table:
// clear keytable; %clear workspace for key results table which will be 8 rows and 2 columns:
// keytable(1,1)={'Number of Years until Retirement'};
// keytable(2,1)={'Average Annual Retirement Contribution'};
// keytable(3,1)={'Total Contributions at Retirement'};
// keytable(4,1)={'Best Case:  Maximum Accumulated Balance'};
// keytable(5,1)={'Worst Case: Minimum Accumulated Balance'};
// keytable(6,1)={'10% Value at Risk'};
// keytable(7,1)={'5% Value at Risk'};
// keytable(8,1)={'1% Value at Risk'};
// keytable(1,2)={years};
// keytable(2,2)={cumcontribute/years}; %average annual retirement contribution as adjusted for input annual inflation rate.
// keytable(3,2)={cumcontribute}; %cumulative annual retirement contributions.
// keytable(4,2)={quantile(results(1,:),1.00)}; %best case accumulated balance
// keytable(5,2)={quantile(results(1,:),0)}; %worst case accumulated balance
// keytable(6,2)={quantile(results(1,:),.10)}; %10% VaR accumulated balance
// keytable(7,2)={quantile(results(1,:),.05)}; %5% VaR accumulated balance
// keytable(8,2)={quantile(results(1,:),.01)}; %1% VaR accumulated balance
// %Save the workspace variables in our named file representing the withdrawal
// %percentage and the bond percentage.
// save (savefile); %save all the workspace variables when done.

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
