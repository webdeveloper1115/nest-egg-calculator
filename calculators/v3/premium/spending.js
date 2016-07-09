/**
 * retireguru3.m Jack DeJong's program for bootstrapping retirement withdrawal results:
 * This is our updated version incorporating newer data and more choices.
 * our data consists of monthly returns from January 1970 to December 2013.
 * our bond returns are 10 year Treasury bonds or Merrill Lynch Corporate Bond Index
 * or a fixed rate CD.
 * our diversified stock portfolios assumes that the S&P 500 is 45% of stock,
 * the Russell 2000 is 30% of stock, and the MSCI EAFE Index is 25% of stock,
 * unless you input different percentages.
 * our cash returns use 1 year Treasury bills or a fixed rate money market fund.
 *
 * First the retiree needs to give their 20 inputs to our calculator.
 * We will assume that their cash percentage = 100% - stock% - bond%.
 * After selecting the percentage allocations for small/midcap equities and
 * international equities, the balance of your stocks will be allocated to large cap US equities.
 */
var Q   = require('q');
var Big = require('big.js');
var rg  = require('../../../lib/app/v3/premium/spending');

module.exports = function(value) {
  var defer    = Q.defer();
  var filepath = process.cwd()+'/lib/nest-egg-calculator/test/data/monthlydata1970to2013.txt';
  // --- Value 1 defaults
  // [0] 250000    'What is the present value of your retirement savings?',...
  // [1] 30        'Select the number of years over which your money needs to last',...
  // [2] 15000     'What is your anticipated initial annual withdrawal amount?',...
  // [3] 3         'Select an annual cost of living adjustment percentage',...
  // [4] 1         'For annual withdrawal select (1) no increases or decreases or
  //                 (2) one increase or decrease or (3) two increases or decreases',...
  // [5] 0         'What is the first increase or decrease in the withdrawal amount?',...
  // [6] 10        'What year does the first increase/decrease in withdrawal amount begin?',...
  // [7] 20        'What year does the first increase/decrease in withdrawal amount end?',...
  // [8] 0         'What is the second increase or decrease in the withdrawal amount?',...
  // [9] 20        'What year does the second increase/decrease in withdrawal amount begin?',...
  // [10] 1        'Estimate your annual investment expenses in percentage'

  // --- Value 2 defaults
  // [0] 50        'What percentage of your retirement portfolio is allocated to stocks?',...
  // [1] 40        'What percentage of your retirement portfolio is allocated to bonds?',...
  // [2] 30        'What percentage of your stocks is allocated to small/midcap equities?',...
  // [3] 25        'What percentage of your stocks is allocated to international equities?',...
  // [4] 3         'For bonds select (1) 10 year Treasury bonds (2) US Corporate bonds or (3) CDs',...
  // [5] 2         'What annual fixed percentage rate do you earn on your CDs?',...
  // [6] 2         'For cash select (1) 1 year Treasury bills or (2) Money market fund',...
  // [7] 0         'What annual fixed percentage rate do you earn on your Money market fund?'...
  // [8] 1         'Choose your withdrawal strategy (1) Annual rebalancing or (2) Stocks first glidepath or
  //                 (3) Bonds first glidepath or (4) Decision based withdrawals'

  var value1 = value.slice(0, 11),
      value2 = value.slice(11);

  var monthlydata1970to2013;
  var withdraw = [];

  rg.readFile(filepath, function(err, _results) {
    monthlydata1970to2013 = _results;

    var inflation = Number(Big(value1[3]).div(100).toFixed(15)), // input the annual cost of living adjustment for inflation.
        expense = Number(Big(value1[10]).div(100).toFixed(15)),  // input the annual investment expenses as given by the retiree.
        bondwt = Number(Big(value2[1]).div(100).toFixed(15)),  // input the portion of the portfolio that is invested in bonds.
        stockwt = Big(value2[0]).div(100),   // input the portion of the portfolio that is invested in stocks.
        sp500wt = Number(stockwt.times(Big(100 - value2[2] - value2[3]).div(100)).toFixed(15));  // 45% or input amount of stock portion is invested in S&P 500.
        russwt = Number(stockwt.times(Big(value2[2]).div(100)).toFixed(15)),  // 30% or input amount of stock portion is invested in Russell 2000.
        eafewt = Number(stockwt.times(Big(value2[3]).div(100)).toFixed(15)),  // 25% or input amount of stock portion is invested in MSCI EAFE Index.
        cashwt = Number(Big(1 - bondwt).minus(stockwt).toFixed(15)),  // remaining percentage of portfolio is invested in 1 year Treasury bills.
        originalwithdrawamt = Number(Big(value1[2]).toFixed(15)),  // set to withdraw retirees target initial annual withdrawal.
        horizon = value1[1] * 12,  // retirement horizon set in number of months with years given by retiree.
        originalbal = value1[0],
        nboot = 5000,  // nboot is the number of bootstrapping samples to generate.

        // preallocate memory for our output file of results:
        results = new Array(11),
        bootsam = new Array(1056),

    //     i, j,
    //     bs, balance, mofailed, withdrawamt, mn, dataset,
    //     bondbal = 0,
    //     sp500bal = 0,
    //     russbal = 0,
    //     eafebal = 0,
    //     cashbal = 0,
    //     failyrs, numfailyrs, probfailyrs, probsuccessyrs,
    //     meanmofailyrs, stdmofailyrs,
    //     minmofailyrs, maxmofailyrs, minyearsfail, maxbal,
    //     rbtable = {}, period, row,
    //     keytable = {}, yrcount,
    //     incometable, cumincome, annincome;

    // Convert to number
    stockwt = Number(stockwt.toFixed(15));

    // Initialize arrays with zeroes.
    // Remove this if it's unecessary.
    results = fill(results, function() { return fill(new Array(nboot), 0);}); // results matrix is where we will store the month of failure and the remaining balances for successes.

    results[0] = fill(results[0], 600);  // save mofailed = 600 in results matrix initially for successes since maximum horizon of 50 years has 600 months.

    bootsam = fill(bootsam, function() {
              return fill(new Array(nboot), function() {
                 // generates 1056 x nboot matrix of integers with imax = 1056 for 1056 months of data.
                 return Math.floor(Math.random() * 1056);
              });
    });

    var cdFixedRate = Number(Big(value2[5]).div(1200).toFixed(15));   // converts input CD annual rate to a monthly rate
    var mmfFixedRate = Number(Big(value2[7]).div(1200).toFixed(15));  // converts input MMF annual rate to a monthly rate
    for (var i = 0; i < 1056; i++) {
      monthlydata1970to2013[i][8] = cdFixedRate;
      monthlydata1970to2013[i][9] = mmfFixedRate;
    }

    // Assign which bond investment will be used based on inputs:
    var bf;
    switch (value2[4]) {
      case 2:  // selected Merrill Lynch US Corporate Bond Index
        bf = 3; // ML US Corporate Bond returns in column 4
        break;
      case 3:  // selected CD with user inputted fixed rate
        bf = 8; // selected CD with user inputted fixed rate
        break;
      default:  // selected 1 for 10 year Treasury bonds
        bf = 2; // 10 year Treasury Bond returns in column 3
        break;
    }

    // Assign which cash fund investment will be used based on inputs:
    var cf;
    if (value2[6] == 2) { // selected MMF with user inputted fixed rate
      cf = 9;  // user input MMF fixed rate in column 10
    }
    else {  // selected 1 for 1 year Treasury bills
      cf = 7; // 1 year Treasury Bill returns in column 8
    }


    // Compute the annual withdrawal amounts adjusted for inflation based on
    // whether there are (1) no increases/decreases (2) one increase/decrease or
    // (3) two increases/decreases.  Increases are positive, decreases negative.

    switch (value1[4]) { // 3 choices for withdrawal pattern:
      case 1: // No increases or decreases other than inflation:
        withdraw[0] = originalwithdrawamt; // first withdraw set by inputs.
        for (var yr = 1; yr < value1[1]; yr++) {
          withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).toFixed(15)); // update next year's withdrawal amount for inflation.
        }
        break;
      case 2: // one increase/decrease that continues to the end of horizon.
        withdraw[0] = originalwithdrawamt; // first withdraw set by inputs.
        for (var yr = 1; yr < value1[1]; yr++) {
          if (yr === value1[6]) { // this is year to increase or decrease.
            withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).plus(Big(value1[5])).toFixed(15)); // update next year's withdrawal amount for inflation plus first increase/decrease.
          }
          else {
            withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).toFixed(15)); // update next year's withdrawal amount for inflation.
          }
        }
        break;
      default: // two increases/decreases plus inflation.
        withdraw[0] = originalwithdrawamt; // first withdraw set by inputs.
        for (var yr = 1; yr < value1[1]; yr++) {
          if (yr === value1[6]) { // this is year to increase or decrease.
            withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).plus(Big(value1[5])).toFixed(15)); // update next year's withdrawal amount for inflation plus first increase/decrease.
          }
          else if (yr === value1[7]) { // this is year to end the first increase or decrease.
            if (value1[7] === value1[9]) { // special case when second increase/decrease starts in same year that first one ends.
              withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).minus(Big(value1[5])).plus(Big(value1[8])).toFixed(15));
            }
            else {
              withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).minus(Big(value1[5])).toFixed(15));
            }
          }
          else if (yr === value1[9]) { // this is year to begin second increase/decrease that continues to retirement horizon. Not same year when first ends.
            withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).plus(Big(value1[8])).toFixed(15)); // update next year's withdrawal amount for inflation plus second increase/decrease.
          }
          else {
            withdraw[yr] = Number(Big(withdraw[yr - 1]).times(1 + inflation).toFixed(15)); // update next year's withdrawal amount for inflation.
          }
        }
        break;
    } // end the switching for three cases of changes to the annual withdrawal amount.


    var bs, balance, mofailed, withdrawamt, mn, dataset;
    var bondbal, sp500bal, russbal, eafebal, cashbal;
    var lybondbal, lysp500bal, lyrussbal = russbal, lyeafebal, lycashbal;

    switch (value2[8]) {
      case 1:
        for (bs = 0; bs < nboot; bs++) {  // nboot is the number of bootstrap samples we want.
          balance = originalbal;  // start each bootstrap sample with inputted dollars in retirement portfolio.
          mofailed = 600; // start each bootstrap sample with mofailed=600 to indicate success.
          withdrawamt = originalwithdrawamt;  // start each bootstrap sample with same withdrawal amount.
          for (mn = 0; mn < horizon; mn++) {  // maximum horizon considered is 50 years or 600 months, but it can be shorter as inputted.

            dataset = monthlydata1970to2013[bootsam[mn][bs]];

            if (mofailed < 600) { // still a success as balance is sufficient to pay next year's withdrawal.
              break;  // stop running the bootstrap sample once it has failed.
            }
            if (mn % 12 === 0) {  // Identified first month of year so rebalance and withdraw
              balance -= withdrawamt;
              if (balance > 0) {
                bondbal = bondwt * balance; // rebalance bond portfolio to have target weight.
                sp500bal = sp500wt * balance; // rebalance S&P 500 portfolio to have target weight.
                russbal = russwt * balance; // rebalance S&P 500 portfolio to have target weight.
                eafebal = eafewt * balance; // rebalance S&P 500 portfolio to have target weight.
                cashbal = cashwt * balance; // rebalance S&P 500 portfolio to have target weight.
              }
              else {  // a failure since balance <= next year's withdrawal amount.
                // calculate the month failure will occur.
                mofailed = (mn - 1) + fix((balance + withdrawamt)/(withdrawamt/12));  // last month + number of monthly payments possible this year.
                results[0][bs] = mofailed;
                break;  // stop the current bootstrap sample after recording the month of failure.
              }
            }
            // update portfolio balances and inflation for successful year
            bondbal = bondbal * (1 + dataset[bf]);  // -  A
            sp500bal = sp500bal * (1 + dataset[3]); //  | A
            russbal = russbal * (1 + dataset[4]);   //  | A
            eafebal = eafebal * (1 + dataset[5]);   //  | A
            cashbal = cashbal * (1 + dataset[cf]);  // -  A
            balance = Number((bondbal + sp500bal + russbal + eafebal + cashbal).toFixed(15));

            if (mn % 12 === 11) {
              var yr = Math.floor(mn / 12); // convert the current month to the current year.
              if (yr < value1[1]) { // not at the end of the retirement horizon so compute next year's withdrawal.
                withdrawamt = withdraw[yr + 1]; // update next year's withdrawal amount for inflation and any increases/decreases.
              } // else, in last year of retirement horizon so no need to compute next year's withdrawal amount.

              balance = Number(Big(balance).times(1 - expense).toFixed(15));  // reduce balance by annual investment fees
            }

            // check to see if in month 12 of years 10, 15, 20, or 25 to
            // calculate and retain the remain total portfolio balance.
            if (mn >= 59 && mn % 60 == 59) {
              results[Math.floor(mn/60) + 1][bs] = balance;
            }
          }
        } // Done with our 4 withdrawal strategies: now compute statistics and report.
        break;
      case 2:
        for (bs = 0; bs < nboot; bs++) {  // nboot is the number of bootstrap samples we want.
          balance = originalbal;  // start each bootstrap sample with inputted dollars in retirement portfolio.

          bondbal = bondwt * balance; // initial bond portfolio has target weight.
          sp500bal = sp500wt * balance; // intial S&P 500 portfolio has target weight.
          russbal = russwt * balance; // initial Russell 2000 portfolio has target weight.
          eafebal = eafewt * balance; // initial EAFE Index portfolio has target weight.
          eqbal = sp500bal + russbal + eafebal; // need total equity balance to annually rebalance only within the 3 equities.
          cashbal = cashwt * balance; // initially the 1 year Treasury bill cash fund has the target weight.

          mofailed = 600; // start each bootstrap sample with mofailed=600 to indicate success.
          withdrawamt = originalwithdrawamt;  // start each bootstrap sample with same withdrawal amount.
          for (mn = 0; mn < horizon; mn++) {  // maximum horizon considered is 50 years or 600 months, but it can be shorter as inputted.

            dataset = monthlydata1970to2013[bootsam[mn][bs]];

            if (mofailed < 600) { // still a success as balance is sufficient to pay next year's withdrawal.
              break;  // stop running the bootstrap sample once it has failed.
            }
            if (mn % 12 === 0) {  // Identified first month of year so rebalance and withdraw
              balance -= withdrawamt;
              if (balance > 0) {  // still a success as balance is sufficient to pay next year's withdrawal.
                if (eqbal >= withdrawamt) { // still can withdraw from stocks first.
                  eqbal -= withdrawamt;  // withdraw current year's distribution entirely from stocks.
                }
                else {  // must withdraw all or some from bonds rather than stocks.
                  if (eqbal > 0) {  // withdraw part from stocks and the balance from bonds or cash.
                    if (bondbal >= withdrawamt) { // can withdraw all from bonds.
                      bondbal = bondbal - withdrawamt + eqbal; // withdraw remaining equity balance and remainder from bonds.
                      eqbal = 0;
                    }
                    else {  // must withdraw some from cash as well.
                      cashbal = cashbal - withdrawamt + eqbal + bondbal;  // withdraw remaining equity and bond balance and remainder from cash.
                      eqbal = 0;
                      bondbal = 0;
                    }
                  }
                  else {  // since equity balance = 0 must withdraw all from bonds or cash.
                    if (bondbal >= withdrawamt) { // can withdraw all from bonds.
                      bondbal -= withdrawamt;
                    }
                    else { // must withdraw all or some from cash rather than bonds.
                      if (bondbal > 0) {  // withdraw part from bonds and balance from cash.
                        cashbal = cashbal - withdrawamt + bondbal;  // withdraw remaining bond balance and remainder from cash.
                        bondbal = 0;
                      }
                      else {  // since bond balance = 0 must withdraw all from cash.
                        cashbal -= withdrawamt; // withdraw all from cash.
                      }
                    }
                  }
                }
                //bondbal=bondwt*balance; %don't rebalance bond portfolio to have target weight.
                sp500bal = (sp500wt / stockwt) * eqbal; // rebalance S&P 500 portfolio to have target weight in the equity portfolio.
                russbal = (russwt / stockwt) * eqbal; // rebalance Russell 2000 portfolio to have target weight in the equity portfolio.
                eafebal = (eafewt / stockwt) * eqbal; // rebalance EAFE Index portfolio to have target weight in the equity portfolio.
                //cashbal=cashwt*balance; %don't rebalance the 1 year Treasury bill cash fund to have the target weight.
              }
              else {  // a failure since balance <= next year's withdrawal amount.
                // calculate the month failure will occur.
                mofailed = (mn - 1) + fix((balance + withdrawamt)/(withdrawamt/12));  // last month + number of monthly payments possible this year.
                results[0][bs] = mofailed;
                break;  // stop the current bootstrap sample after recording the month of failure.
              }
            }

            // update portfolio balances and inflation for successful year
            bondbal *= (1 + dataset[bf]);
            sp500bal *= (1 + dataset[3]);
            russbal *= (1 + dataset[4]);
            eafebal *= (1 + dataset[5]);
            cashbal *= (1 + dataset[cf]);
            balance = bondbal + sp500bal + russbal + eafebal + cashbal;

            if (mn % 12 === 11) {
              var yr = Math.floor(mn / 12); // convert the current month to the current year.
              if (yr < value1[1]) { // not at the end of the retirement horizon so compute next year's withdrawal.
                withdrawamt = withdraw[yr + 1]; // update next year's withdrawal amount for inflation and any increases/decreases.
              } // else, in last year of retirement horizon so no need to compute next year's withdrawal amount.

              // reduce balance by annual investment fees allocated by
              // percentage of portfolio.
              bondbal *= (1 - (bondbal / balance) * expense);
              sp500bal *= (1 - (sp500bal / balance) * expense);
              russbal *= (1 - (russbal / balance) * expense);
              eafebal *= (1 - (eafebal / balance) * expense);
              cashbal *= (1 - (cashbal / balance) * expense);
              balance = bondbal + sp500bal + russbal + eafebal + cashbal; // update total portfolio balance after annual expenses deducted.
              // note that rebalancing to target weights will happen in
              // first month after next annual withdrawal is deducted.
            }

            eqbal = sp500bal + russbal + eafebal; // compute equity portfolio balance.

            // check to see if in month 12 of years 10, 15, 20, or 25 to
            // calculate and retain the remain total portfolio balance.
            if (mn >= 59 && mn % 60 == 59) {
              results[Math.floor(mn/60) + 1][bs] = balance;
            }
          }
        } // Done with our 4 withdrawal strategies: now compute statistics and report.
        break;
      case 3:
        for (bs = 0; bs < nboot; bs++) {  // nboot is the number of bootstrap samples we want.
          balance = originalbal;  // start each bootstrap sample with inputted dollars in retirement portfolio.

          bondbal = bondwt * balance; // initial bond portfolio has target weight.
          sp500bal = sp500wt * balance; // intial S&P 500 portfolio has target weight.
          russbal = russwt * balance; // initial Russell 2000 portfolio has target weight.
          eafebal = eafewt * balance; // initial EAFE Index portfolio has target weight.
          eqbal = sp500bal + russbal + eafebal; // need total equity balance to annually rebalance only within the 3 equities.
          cashbal = cashwt * balance; // initially the 1 year Treasury bill cash fund has the target weight.

          mofailed = 600; // start each bootstrap sample with mofailed=600 to indicate success.
          withdrawamt = originalwithdrawamt;  // start each bootstrap sample with same withdrawal amount.
          for (mn = 0; mn < horizon; mn++) {  // maximum horizon considered is 50 years or 600 months, but it can be shorter as inputted.

            dataset = monthlydata1970to2013[bootsam[mn][bs]];

            if (mofailed < 600) { // still a success as balance is sufficient to pay next year's withdrawal.
              break;  // stop running the bootstrap sample once it has failed.
            }
            if (mn % 12 === 0) {  // Identified first month of year so rebalance and withdraw
              balance -= withdrawamt;
              if (balance > 0) {  // still a success as balance is sufficient to pay next year's withdrawal.
                if (bondbal >= withdrawamt) { // still can withdraw from stocks first.
                  bondbal -= withdrawamt;  // withdraw current year's distribution entirely from stocks.
                }
                else {  // must withdraw all or some from bonds rather than stocks.
                  if (bondbal > 0) {  // withdraw part from stocks and the balance from bonds or cash.
                    if (cashbal >= withdrawamt) { // can withdraw all from bonds.
                      cashbal = cashbal - withdrawamt + bondbal; // withdraw remaining equity balance and remainder from bonds.
                      bondbal = 0;
                    }
                    else {  // must withdraw some from cash as well.
                      eqbal = eqbal - withdrawamt + bondbal + cashbal;  // withdraw remaining equity and bond balance and remainder from cash.
                      bondbal = 0;
                      cashbal = 0;
                    }
                  }
                  else {  // since equity balance = 0 must withdraw all from bonds or cash.
                    if (cashbal >= withdrawamt) { // can withdraw all from bonds.
                      cashbal -= withdrawamt;
                    }
                    else { // must withdraw all or some from cash rather than bonds.
                      if (cashbal > 0) {  // withdraw part from bonds and balance from cash.
                        eqbal = eqbal - withdrawamt + cashbal;  // withdraw remaining bond balance and remainder from cash.
                        cashbal = 0;
                      }
                      else {  // since bond balance = 0 must withdraw all from cash.
                        eqbal -= withdrawamt; // withdraw all from cash.
                      }
                    }
                  }
                }
                //bondbal=bondwt*balance; %don't rebalance bond portfolio to have target weight.
                sp500bal = (sp500wt / stockwt) * eqbal; // rebalance S&P 500 portfolio to have target weight in the equity portfolio.
                russbal = (russwt / stockwt) * eqbal; // rebalance Russell 2000 portfolio to have target weight in the equity portfolio.
                eafebal = (eafewt / stockwt) * eqbal; // rebalance EAFE Index portfolio to have target weight in the equity portfolio.
                //cashbal=cashwt*balance; %don't rebalance the 1 year Treasury bill cash fund to have the target weight.
              }
              else {  // a failure since balance <= next year's withdrawal amount.
                // calculate the month failure will occur.
                mofailed = (mn - 1) + fix((balance + withdrawamt)/(withdrawamt/12));  // last month + number of monthly payments possible this year.
                results[0][bs] = mofailed;
                break;  // stop the current bootstrap sample after recording the month of failure.
              }
            }

            // update portfolio balances and inflation for successful year
            bondbal *= (1 + dataset[bf]);
            sp500bal *= (1 + dataset[3]);
            russbal *= (1 + dataset[4]);
            eafebal *= (1 + dataset[5]);
            cashbal *= (1 + dataset[cf]);
            balance = bondbal + sp500bal + russbal + eafebal + cashbal;

            if (mn % 12 === 11) {
              var yr = Math.floor(mn / 12); // convert the current month to the current year.
              if (yr < value1[1]) { // not at the end of the retirement horizon so compute next year's withdrawal.
                withdrawamt = withdraw[yr + 1]; // update next year's withdrawal amount for inflation and any increases/decreases.
              } // else, in last year of retirement horizon so no need to compute next year's withdrawal amount.

              // reduce balance by annual investment fees allocated by
              // percentage of portfolio.
              bondbal *= (1 - (bondbal / balance) * expense);
              sp500bal *= (1 - (sp500bal / balance) * expense);
              russbal *= (1 - (russbal / balance) * expense);
              eafebal *= (1 - (eafebal / balance) * expense);
              cashbal *= (1 - (cashbal / balance) * expense);
              balance = bondbal + sp500bal + russbal + eafebal + cashbal; // update total portfolio balance after annual expenses deducted.
              // note that rebalancing to target weights will happen in
              // first month after next annual withdrawal is deducted.
            }

            eqbal = sp500bal + russbal + eafebal; // compute equity portfolio balance.

            // check to see if in month 12 of years 10, 15, 20, or 25 to
            // calculate and retain the remain total portfolio balance.
            if (mn >= 59 && mn % 60 == 59) {
              results[Math.floor(mn/60) + 1][bs] = balance;
            }
          }
        } // Done with our 4 withdrawal strategies: now compute statistics and report.
        break;
      default:
        for (bs = 0; bs < nboot; bs++) {  // nboot is the number of bootstrap samples we want.
          balance = originalbal;  // start each bootstrap sample with inputted dollars in retirement portfolio.

          bondbal = bondwt * balance; // initial bond portfolio has target weight.
          sp500bal = sp500wt * balance; // intial S&P 500 portfolio has target weight.
          russbal = russwt * balance; // initial Russell 2000 portfolio has target weight.
          eafebal = eafewt * balance; // initial EAFE Index portfolio has target weight.
          eqbal = sp500bal + russbal + eafebal; // need total equity balance to annually rebalance only within the 3 equities.
          cashbal = cashwt * balance; // initially the 1 year Treasury bill cash fund has the target weight.

          mofailed = 600; // start each bootstrap sample with mofailed=600 to indicate success.
          withdrawamt = originalwithdrawamt;  // start each bootstrap sample with same withdrawal amount.

          for (mn = 0; mn < horizon; mn++) {

            dataset = monthlydata1970to2013[bootsam[mn][bs]];

            if (mofailed < 600) { // still a success as balance is sufficient to pay next year's withdrawal.
              break;  // stop running the bootstrap sample once it has failed.
            }
            if (mn % 12 === 0) {  // Identified first month of year so rebalance and withdraw
              // retain values for last year's asset balances
              lybondbal = bondbal;
              lysp500bal = sp500bal;
              lyrussbal = russbal;
              lyeafebal = eafebal;
              lycashbal = cashbal;
              balance -= withdrawamt; // annual withdrawal amount is put in non-interest bearing cash account at beginning of year.
              if (balance > 0) { // still a success as balance is sufficient to pay next year's withdrawal.
                if (cashbal >= withdrawamt) { // still can withdraw from cash first.
                  cashbal -= withdrawamt;  // withdraw current year's distribution entirely from cash.
                }
                else {  // must withdraw all or some from bonds and stocks rather than cash.
                  if (cashbal > 0) {  // withdraw part from cash and the balance from bonds or stocks.
                    if (bondbal >= withdrawamt) { // can withdraw all from cash and bonds.
                      bondbal = bondbal - withdrawamt + cashbal; //withdraw remaining cash balance and remainder from bonds.
                      cashbal = 0;
                    }
                    else {  // must withdraw some from stocks as well.
                      eqbal = eqbal - withdrawamt + bondbal + cashbal; //withdraw remaining bond and cash balance and remainder from equities.
                      bondbal = 0;
                      cashbal = 0;
                      sp500bal = (sp500wt / stockwt) * eqbal; //rebalance S&P 500 portfolio to have target weight in the equity portfolio.
                      russbal = (russwt / stockwt) * eqbal; //rebalance Russell 2000 portfolio to have target weight in the equity portfolio.
                      eafebal = (eafewt / stockwt) * eqbal; //rebalance EAFE Index portfolio to have target weight in the equity portfolio.
                    }
                  }
                  else {  // since cash balance = 0 must withdraw all from bonds or equities.
                    if (bondbal >= withdrawamt) { // can withdraw all from bonds.
                      bondbal -= withdrawamt;
                    }
                    else {  // must withdraw all or some from equities.
                      if (bondbal > 0) {  // withdraw part from bonds and balance from equities.
                        eqbal = eqbal - withdrawamt + bondbal;  // withdraw remaining bond balance and remainder from equities.
                        bondbal = 0;
                        sp500bal = (sp500wt / stockwt) * eqbal; // rebalance S&P 500 portfolio to have target weight in the equity portfolio.
                        russbal = (russwt / stockwt) * eqbal; // rebalance Russell 2000 portfolio to have target weight in the equity portfolio.
                        eafebal = (eafewt / stockwt) * eqbal; // rebalance EAFE Index portfolio to have target weight in the equity portfolio.
                      }
                      else {  // since bond balance = 0 must withdraw all from equities.
                        eqbal = eqbal - withdrawamt;  // withdraw all from equities.
                        sp500bal = (sp500wt / stockwt) * eqbal; // rebalance S&P 500 portfolio to have target weight in the equity portfolio.
                        russbal = (russwt / stockwt) * eqbal; // rebalance Russell 2000 portfolio to have target weight in the equity portfolio.
                        eafebal = (eafewt / stockwt) * eqbal; // rebalance EAFE Index portfolio to have target weight in the equity portfolio.
                      }
                    }
                  }
                }

                // bondbal=bondwt*balance; %don't rebalance bond portfolio to have target weight.
                // sp500bal=(sp500wt/stockwt)*eqbal; %rebalance S&P 500 portfolio to have target weight in the equity portfolio.
                // russbal=(russwt/stockwt)*eqbal; %rebalance Russell 2000 portfolio to have target weight in the equity portfolio.
                // eafebal=(eafewt/stockwt)*eqbal; %rebalance EAFE Index portfolio to have target weight in the equity portfolio.
                // cashbal=cashwt*balance; %don't rebalance the 1 year Treasury bill cash fund to have the target weight.

                // update portfolio balances and inflation for successful year
                // bondbal *= (1 + dataset[bf]);
                // sp500bal *= (1 + dataset[3]);
                // russbal *= (1 + dataset[4]);
                // eafebal *= (1 + dataset[5]);
                // cashbal *= (1 + dataset[cf]);
                // balance = bondbal + sp500bal + russbal + eafebal + cashbal; // compute total portfolio balance.
                // eqbal = sp500bal + russbal + eafebal; // compute equity portfolio balance.
              }
              else {  // a failure since balance <= next year's withdrawal amount.
                // calculate the month failure will occur.
                mofailed = (mn - 1) + fix((balance + withdrawamt)/(withdrawamt/12)); // last month + number of monthly payments possible this year.
                results[0][bs] = mofailed;
                break; // stop the current bootstrap sample after recording the month of failure.
              }
            }

            bondbal *= (1 + dataset[bf]);
            sp500bal *= (1 + dataset[3]);
            russbal *= (1 + dataset[4]);
            eafebal *= (1 + dataset[5]);
            cashbal *= (1 + dataset[cf]);
            balance = bondbal + sp500bal + russbal + eafebal + cashbal; // compute total portfolio balance.

            if (mn % 12 === 11) { // identified 12th month of year so update inflation and deduct fees for the year.
              var yr = Math.floor(mn / 12); // convert the current month to the current year.
              if (yr < value1[1]) { // not at the end of the retirement horizon so compute next year's withdrawal.
                withdrawamt = withdraw[yr + 1]; // update next year's withdrawal amount for inflation and any increases/decreases.
              } // else, in last year of retirement horizon so no need to compute next year's withdrawal amount.

              // reduce balance by annual investment fees allocated by
              // percentage of portfolio.
              bondbal *= (1 - (expense * (bondbal / balance)));
              sp500bal *= (1 - (expense * (sp500bal / balance)));
              russbal *= (1 - (expense * (russbal / balance)));
              eafebal *= (1 - (expense * (eafebal / balance)));
              cashbal *= (1 - (expense * (cashbal / balance)));
              balance = bondbal + sp500bal + russbal + eafebal + cashbal; // update total portfolio balance after annual expenses deducted.
              eqbal = sp500bal + russbal + eafebal; // update equity portfolio balance after annual expenses deducted.

              // at end of month 12 check if bonds and equities have
              // positive annual return and overweighted from target
              // weights.  If so transfer overweighting to cash fund for
              // future withdrawals.  If negative return or not
              // overweighted then no transfer to cash fund.  Withdrawals
              // are taken first from cash, second from bonds, then stocks.
              if ((bondbal > lybondbal) && (bondbal > bondwt*balance)) {
                cashbal = cashbal + bondbal - bondwt*balance; // transfer overweighted bond portion to cash.
                bondbal = bondwt * balance;
              }
              if ((sp500bal > lysp500bal) && (sp500bal > sp500wt * balance)) {
                cashbal = cashbal + sp500bal - sp500wt * balance; // transfer overweighted s&p 500 portion to cash.
                sp500bal = sp500wt * balance;
              }
              if ((russbal > lyrussbal) && (russbal > russwt * balance)) {
                cashbal = cashbal + russbal - russwt * balance; // transfer overweighted russell 2000 portion to cash.
                russbal = russwt * balance;
              }
              if ((eafebal > lyeafebal) && (eafebal > eafewt * balance)) {
                cashbal = cashbal + eafebal - eafewt * balance; // transfer overweighted EAFE portion to cash.
                eafebal = eafewt * balance;
              }
            }

            eqbal = sp500bal + russbal + eafebal; // compute equity portfolio balance.

            if (mn >= 59 && mn % 60 == 59) {
              results[Math.floor(mn/60) + 1][bs] = balance;
            }
          }
        }
        break;
    }
    var failyrs = results[0]
                    .filter(function(v) {
                      // identify indices of columns where (monthfailed < horizon) length in months.
                      return v < horizon;
                    });
    var numfailyrs = failyrs.length; // number of columns in results where monthfailed<horizon length in months.
    var probfailyrs = numfailyrs / nboot; // probability of failure within horizon length in months.
    var probsuccessyrs = (nboot - numfailyrs) / nboot; // probability of success within horizon length in months.


    var meanmofailyrs = mean(failyrs);
    var stdmofailyrs = std(failyrs);
    var minmofailyrs = Math.min.apply(null, failyrs);
    var maxmofailyrs = Math.max.apply(null, failyrs);

    // Second find remaining balance statistics for successes by horizon period:
    // Save the remaining balances in a 12 x 11 Table



    // for (bs = 0; bs < nboot; bs++) {
    //   balance = originalbal;
    //   mofailed = 600;
    //   withdrawamt = originalwithdrawamt;

    //   for (mn = 0; mn < horizon; mn++) {
    //     dataset = monthlydata1970to2013[bootsam[mn][bs]];

    //     if (mofailed < 600) {
    //       break;
    //     }

    //     if (mn % 12 === 0) {
    //       balance = balance - withdrawamt;

    //       if (balance > 0) {
    //         bondbal = bondwt * balance;
    //         sp500bal = sp500wt * balance;
    //         russbal = russwt * balance;
    //         eafebal = eafewt * balance;
    //         cashbal = cashwt * balance;
    //       }
    //       else {
    //         mofailed = (mn-1) + fix((balance + withdrawamt) / (withdrawamt / 12));
    //         results[0][bs] = mofailed;
    //         break;
    //       }
    //     }

    //     bondbal = bondbal * (1 + dataset[1]);
    //     sp500bal = sp500bal * (1 + dataset[2]);
    //     russbal = russbal * (1 + dataset[3]);
    //     eafebal = eafebal * (1 + dataset[4]);
    //     cashbal = cashbal * (1 + dataset[5]);
    //     balance = Number((bondbal + sp500bal + russbal + eafebal + cashbal).toFixed(15));


    //     if (mn % 12 === 11) {
    //       withdrawamt = Number(Big(withdrawamt).times(1 + inflation).toFixed(15));
    //       balance = Number(Big(balance).times(1 - expense).toFixed(15));
    //     }

    //     if (mn >= 59 && mn % 60 == 59) {
    //       results[Math.floor(mn/60) + 1][bs] = balance;
    //     }
    //   }
    // }

    // failyrs = results[0].filter(function(v) {
    //             return v < horizon;
    //           });

    // numfailyrs = failyrs.length;
    // probfailyrs = numfailyrs / nboot;
    // probsuccessyrs = (nboot - numfailyrs) / nboot;

    // meanmofailyrs = mean(failyrs);
    // stdmofailyrs = std(failyrs);
    // minmofailyrs = Math.min.apply(null, failyrs);
    // maxmofailyrs = Math.max.apply(null, failyrs);

    var rbtable = {};

    // rbtable['Highest Balance'] = [];
    // rbtable['Mean Balance'] = [];
    // 
    rbtable['Lowest Balance']          = [];
    rbtable['1% Value at Risk']        = [];
    rbtable['5% Value at Risk']        = [];
    rbtable['10% Value at Risk']       = [];
    rbtable['20th Percentile Balance'] = [];
    rbtable['40th Percentile Balance'] = [];
    rbtable['Median Balance']          = [];
    rbtable['60th Percentile Balance'] = [];
    rbtable['80th Percentile Balance'] = [];

    for(i = 1; i < results.length; i++) {
      var row = results[i].sort(ascendingOrder);
      // rbtable['Highest Balance'].push(row[row.length - 1].toExponential());
      // rbtable['Mean Balance'].push(mean(row).toExponential());
      rbtable['80th Percentile Balance'].push(quantile(row, 0.8).toExponential());
      rbtable['60th Percentile Balance'].push(quantile(row, 0.6).toExponential());
      rbtable['Median Balance'].push(quantile(row, 0.5).toExponential());
      rbtable['40th Percentile Balance'].push(quantile(row, 0.4).toExponential());
      rbtable['20th Percentile Balance'].push(quantile(row, 0.2).toExponential());
      rbtable['10% Value at Risk'].push(quantile(row, 0.1).toExponential());
      rbtable['5% Value at Risk'].push(quantile(row, 0.05).toExponential());
      rbtable['1% Value at Risk'].push(quantile(row, 0.01).toExponential());
      rbtable['Lowest Balance'].push(row[0].toExponential());
    }

    var yrcount = horizon / 12;
    var k = Math.floor(yrcount / 5); // results for horizon years stored in row k of results matrix.
    var maxbal = Math.max.apply(null, results[k]);

    var keytable = {};

    keytable['Number of Years in Retirement Horizon']    = yrcount;
    keytable['Probability of Success in Horizon Period'] = probsuccessyrs;
    keytable['Maximum Remaining Balance']                = maxbal.toExponential();
    keytable['Percentage of Time Savings Failed']        = probfailyrs;
    
    var minyearsfail  = minmofailyrs / 12;
    var depletedYears = results[0].sort(ascendingOrder);

    keytable['Worst Case: Savings Depleted in Years']        = minyearsfail;
    keytable['Best Case: Savings Depleted in Years']         = quantile(depletedYears, 1.0).toExponential() / 12;
    keytable['80th Percentile: Savings Depleted in Years']   = quantile(depletedYears, 0.8).toExponential() / 12;
    keytable['60th Percentile: Savings Depleted in Years']   = quantile(depletedYears, 0.6).toExponential() / 12;
    keytable['Mean: Savings Depleted in Years']              = mean(depletedYears).toExponential() / 12;
    keytable['Median: Savings Depleted in Years']            = quantile(depletedYears, 0.5).toExponential() / 12;
    keytable['40th Percentile: Savings Depleted in Years']   = quantile(depletedYears, 0.4).toExponential() / 12;
    keytable['20th Percentile: Savings Depleted in Years']   = quantile(depletedYears, 0.2).toExponential() / 12;
    keytable['10% Value at Risk: Savings Depleted in Years'] = quantile(depletedYears, 0.1).toExponential() / 12;
    keytable['5% Value at Risk: Savings Depleted in Years']  = quantile(depletedYears, 0.05).toExponential() / 12;
    keytable['1% Value at Risk: Savings Depleted in Years']  = quantile(depletedYears, 0.01).toExponential() / 12;

    var incometable = {'Annual Income with C.O.L.A. and Increases/Decreases': [],
                   'Cumulative Retirement Income': []};

    var cumincome = 0;

    for (kk = 0; kk < yrcount; kk++) {
      annincome = withdraw[kk]; // annual withdrawals reflect inflation and any increases/decreases.
      incometable['Annual Income with C.O.L.A. and Increases/Decreases'][kk] = annincome.toExponential();
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
