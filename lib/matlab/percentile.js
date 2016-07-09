module.exports = percentile;
//PRCTILE Percentiles of a sample.
//   Y = PRCTILE(X,P) returns percentiles of the values in X.  P is a scalar
//   or a vector of percent values.  When X is a vector, Y is the same size
//   as P, and Y(i) contains the P(i)-th percentile.  When X is a matrix,
//   the i-th row of Y contains the P(i)-th percentiles of each column of X.
//   For N-D arrays, PRCTILE operates along the first non-singleton
//   dimension.
//
//   Y = PRCTILE(X,P,DIM) calculates percentiles along dimension DIM.  The
//   DIM'th dimension of Y has length LENGTH(P).
//
//   Percentiles are specified using percentages, from 0 to 100.  For an N
//   element vector X, PRCTILE computes percentiles as follows:
//      1) The sorted values in X are taken as the 100*(0.5/N), 100*(1.5/N),
//         ..., 100*((N-0.5)/N) percentiles.
//      2) Linear interpolation is used to compute percentiles for percent
//         values between 100*(0.5/N) and 100*((N-0.5)/N)
//      3) The minimum or maximum values in X are assigned to percentiles
//         for percent values outside that range.
//
//   PRCTILE treats NaNs as missing values, and removes them.
//
//   Examples:
//      y = prctile(x,50); // the median of x
//      y = prctile(x,[2.5 25 50 75 97.5]); // a useful summary of x
//
//   See also IQR, MEDIAN, NANMEDIAN, QUANTILE.

//   Copyright 1993-2004 The MathWorks, Inc.
function percentile(x, p, dim) {

  if (!isVector(p) || numel(p) === 0 || any (p < 0 | p > 100) || !isreal(p)) {
    throw new Error('stats:prctile:BadPercents');
  }

  var sz = x.length;
  var dimArgGiven;

  if (arguments.length < 3) {
    dim = getDimension(sz);
    if (isEmpty(dim)) {
      dim = 1;
    }
    dimArgGiven = false;
  }
  else {
    // Permute the array so that the requested dimension is the first dim.
    var nDimsX = ndims(x);
    // perm = [dim:max(nDimsX,dim) 1:dim-1];
    x = permute(x,perm);
    // Pad with ones if dim > ndims.
    if (dim > nDimsX) {
      // sz = [sz ones(1,dim-nDimsX)];
    }
    sz = sz(perm);
    dim = 1;
    dimArgGiven = true;  }
}

function isVector(v) {
  return v.constructor === Array;
}

function numel(v) {
  return v.length;
}

function any(v) {
  return v.some(percent);
}

function percent(percentage, index, array) {
  return percentage < 0 | percentage > 100;
}

function isReal(n) {
  return typeof n == 'number' && !isNaN(n) && isFinite(n);
}

// Figure out which dimension prctile will work along.
function getDimension(array) {
  var el = array[0];
  if (el.constructor === Array) {
    return el.length;
  }
  else if (array.length){
    return array.length;
  }
  else {
    return undefined;
  }
}

function ndims(array) {
  var size,
      dimensions = 1;
  for (var i = 0; i < array.length; i++) {
    size = array[i].length;
    if (size) {
      dimensions = Math.max(dimensions, 1);
    }
  }
  return dimensions;
}
