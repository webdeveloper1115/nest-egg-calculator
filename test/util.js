var chai = require('chai');
    expect = chai.expect;
    chai.should();

var neg = require('../lib/neg/util');

describe('Import text file', function() {
  it('should read in the text file', function(done) {
    neg.readFile('test/data/monthlydata1970to2010.txt', function(err, results) {
      results.length.should.equal(984);
      var first = results[0],
          last = results[results.length - 1];

      first[0].should.equal("1/1/1970");
      first[1].should.equal(0.028827);
      first[2].should.equal(-0.075398);
      first[3].should.equal(-0.030529);
      first[4].should.equal(-0.0108);
      first[5].should.equal(0.00675);

      last[0].should.equal("12/1/2010");
      last[1].should.equal(0.007214);
      last[2].should.equal(0.0653);
      last[3].should.equal(-0.077908);
      last[4].should.equal(-0.081064);
      last[5].should.equal(0.000241667);
      done();
    });
  });
});
