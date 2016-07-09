exports.prompt = function() {
  var questions = [
      'What is the present value of your retirement savings?',
      'Select the number of years over which your money needs to last',
      'What is your anticipated initial annual withdrawal amount?',
      'Select an annual cost of living adjustment percentage',
      'Estimate your annual investment expenses in percentage',
      'What percentage of your retirement portfolio is allocated to stocks?',
      'What percentage of your retirement portfolio is allocated to bonds?',
      'What percentage of your retirement portfolio is allocated to cash?',
      'For bonds select (1) 10 year Treasury bonds (2) US Corporate bonds or (3) CDs',
      'What annual fixed percentage rate do you earn on your CDs?',
      'For cash select (1) 1 year Treasury bills or (2) Money market fund',
      'What annual fixed percentage rate do you earn on your Money market fund?'
  ],
  defaults = ['250000','30','15000','3','1','50','40','10','3','1','2','0'],
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
  var row = buffer.split('\t');

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
    fileData.push(row);
  }
}
