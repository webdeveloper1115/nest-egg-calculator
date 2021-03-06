exports.prompt = function() {
  var questions = [
      'What is the number of years until you retire?',
      'What is your current annual salary/wages?',
      'For annual contribution select (1) % of salary/wages or (2) dollar amount',
      'What is your annual contribution as % of your salary/wages?',
      'What is your annual contribution as a fixed dollar amount?',
      'Select % by which you will increase your contributions each year',
      'Estimate your annual investment expenses in percentage',
      'What is your current retirement portfolio value?',
      'What percentage of your retirement portfolio is allocated to stocks?',
      'What percentage of your portfolio should be allocated to stocks at retirement?',
      'What percentage of your retirement portfolio is allocated to bonds?',
      'What percentage of your stocks is allocated to small/midcap equities?',
      'What percentage of your stocks is allocated to international equities?',
      'For bonds select (1) 10 year Treasury bonds (2) US Corporate bonds or (3) CDs',
      'What annual fixed percentage rate do you earn on your CDs?',
      'For cash select (1) 1 year Treasury bills or (2) Money market fund',
      'What annual fixed percentage rate do you earn on your Money market fund?'
  ],
  defaults = ['25','125000','1','10','12500','3','1','1250000','50','50','40','30','25','3','2','2','0'],
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
    fileData[row[0] - 1] = row;
  }
}
