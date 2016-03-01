'use strict';

const _ = require('lodash');

module.exports = function nest(seq, keys) {
  if (!keys.length) {
    return seq;
  }

  const first = keys[0];
  const rest = keys.slice(1);
  return _.mapValues(_.groupBy(seq, first), (value) => { 
    return nest(value, rest)
  });
};
