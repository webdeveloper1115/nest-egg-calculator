exports.prompt = function() {
  var questions = [
      'What is the present value of your retirement savings?',
      'Select the number of years over which your money needs to last',
      'What is your anticipated initial annual withdrawal amount?',
      'Select an annual cost of living adjustment percentage',
      'Estimate your annual investment expenses in percentage',
      'What percentage of your retirement portfolio is allocated to stocks?',
      'What percentage of your retirement portfolio is allocated to bonds?',
      'What percentage of your retirement portfolio is allocated to cash?'
  ],
  defaults = ['250000','30','15000','3','1','50','40','10'],
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
  if (row.length == 7) {

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
    fileData[row[0] - 1] = row.slice(1);
  }
}
