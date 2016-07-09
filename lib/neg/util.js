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


/*
 * Helper function
 */
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
