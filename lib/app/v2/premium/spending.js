exports.prompt = function() {
  var questions = [
    'What is the present value of your retirement savings?',
    'Select the number of years over which your money needs to last',
    'What is your anticipated initial annual withdrawal amount?',
    'Select an annual cost of living adjustment percentage',
    'Estimate your annual investment expenses in percentage',
    'What percentage of your retirement portfolio is allocated to stocks?',
    'What percentage of your retirement portfolio is allocated to bonds?',
    'What percentage of your stocks is allocated to small/midcap equities?',
    'What percentage of your stocks is allocated to international equities?',
    'For bonds select (1) 10 year Treasury bonds (2) US Corporate bonds or (3) CDs',
    'What annual fixed percentage rate do you earn on your CDs?',
    'For cash select (1) 1 year Treasury bills or (2) Money market fund',
    'What annual fixed percentage rate do you earn on your Money market fund?',
    'Choose your withdrawal strategy (1) Annual rebalancing or (2) Stocks first glidepath or (3) Bonds first glidepath or (4) Decision based withdrawals'
  ],
  defaults = ['250000','30','15000','3','1','50','40','30','25','1','3','1','1','1'],
  answers = defaults.map(Number);

  return answers;
};

var fs = require('fs'),
    split = require('split');

exports.readFile = function readFile(filepath, callback) {
  var fileData = [];

  return fs.createReadStream(filepath)
    .pipe(split())
      .on('data', function(line) {
        parseFile(line, fileData);
      })
      .on('end', function() {
        callback(null, fileData);
      });

};

function parseFile(buffer, fileData) {
  var row = buffer.split(/\s+/);

  // Make sure all the columns are provided
  if (row.length == 8) {
    // Convert to numbers
    row = row.map(function(row, i) {
      if (i != 1) {
        return Number(row);
      }
      else {
        return row;
      }
    });

    // Populate `fileData`
    fileData[row[0] - 1] = row;
  }
}
