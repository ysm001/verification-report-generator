'use strict'

const Fio = require('./fio.js');
const Kernbench = require('./kernbench.js');
const Lmbench = require('./lmbench.js');
const Netperf = require('./netperf/netperf.js');
const NetperfTime = require('./netperf/netperfTime.js');
const NetperfEach = require('./netperf/netperfEach.js');

module.exports = class ConverterFactory {
  static create(type, dataSource) {
    switch(type) {
      case 'fio': return [Fio];
      case 'kernbench': return [Kernbench];
      case 'lmbench': return [Lmbench];
      case 'netperf': return [NetperfTime,  Netperf,  NetperfEach];
    }
  }
}
