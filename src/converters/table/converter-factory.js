'use strict'

const Fio = require('./fio.js');
const Kernbench = require('./kernbench.js');
const Lmbench = require('./lmbench.js');
const Netperf = require('./netperf.js');

module.exports = class ConverterFactory {
  static create(type) {
    switch(type) {
      case 'fio': return Fio;
      case 'kernbench': return Kernbench;
      case 'lmbench': return Lmbench;
      case 'netperf': return Netperf;
    }
  }
}
