'use strict';

module.exports = class LogType {
  static get FIO() { return 'fio'; }
  static get LMBENCH() { return 'lmbench'; }
  static get KERNBENCH() { return 'kernbench'; }
  static get NETPERF() { return 'netperf'; }

  static get all() { return [LogType.FIO, LogType.LMBENCH, LogType.KERNBENCH, LogType.NETPERF]; }
}
