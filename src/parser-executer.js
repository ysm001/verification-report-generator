'use strict';

const fs = require('fs');
const exec = require('child_process').exec;
const config = require('../config/directory.js');

const PromiseDir = require('../libs/promise-dir.js');
const logger = require('../libs/logger.js');
const LogType = require('./log-type.js');
const co = require('co');
const foreach = require('co-foreach');
const wait = require('co-wait');

module.exports = class ParserExecuter {
  static get interval() { return 500; }

  static exec(logPath, type, oldVersion, newVersion) {
    return PromiseDir.getDirs(`${logPath}/${type}`).then((logDirs) => {
      return ParserExecuter.execParser(type, logDirs, oldVersion, newVersion);
    });
  }

  static execAll(logPath, types, oldVersion, newVersion) {
    let result = {};
    const targetTypes = types || LogType.all;

    return foreach(types, function *(type) {
      yield wait(ParserExecuter.interval);
      result[type] = JSON.parse(yield ParserExecuter.exec(logPath, type, oldVersion, newVersion));
    }).then(() => {
      return result;
    });
  }

  static execParser(type, targets, oldVersion, newVersion) {
    const query = ParserExecuter.makeQuery(type, targets, oldVersion, newVersion);

    logger.info(query);
    return new Promise((resolve, reject) => {
      exec(query, (error, stdout, stderr) => {
        if (error !== null) return reject(error);
        if (stderr) logger.error(stderr);
        if (stdout) resolve(stdout);
      })
    });
  }

  static makeQuery(type, targets, oldVersion, newVersion) {
    const parser = `${config.appRoot}/scripts/parsers/${type}.rb`;
    const args = ParserExecuter.makeArgs(type, targets, oldVersion, newVersion);

    return `ruby ${parser} ${args}`;
  }

  static makeArgs(type, targets, oldVersion, newVersion) {
    if (type != 'netperf') {
      const oldLog = ParserExecuter.getTarget(targets, oldVersion);
      const newLog = ParserExecuter.getTarget(targets, newVersion);
      
      return `${oldLog} ${newLog}`;
    } else {
      return targets[0].split("/").reverse().slice(1).reverse().join("/");
    }
  }

  static getTarget(targets, version) {
    return targets.find((target) => {
      const dir = target.match(".+/(.+?)([\?#;].*)?$")[1];
      return dir == version;
    });
  }
}
