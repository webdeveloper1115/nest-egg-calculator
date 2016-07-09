exports.free = {
  saving: require('./calculators/v3/free/savings'),
  spending: require('./calculators/v3/free/spending')
};

exports.premium = {
  saving: require('./calculators/v3/premium/savings'),
  spending: require('./calculators/v3/premium/spending')
};
