'use strict';

const fs = require('fs');
const fsp = require('fs-promise');
const ParserExecuter = require('../parser-executer.js');
const LogFormatter = require('../log-formatter.js');
const directory = require('../../config/directory.json');
const logger = require('../../libs/logger.js');
const map = require('promise-map-series');

module.exports = class Log {
  constructor(oldVersion, newVersion, machine, path, json) {
    this.oldVersion = oldVersion;
    this.newVersion = newVersion;
    this.machine = machine;
    this.path = path;
    this.json = json;
  }

  static toJSON(oldVersion, newVersion, path) {
    return this.getTargetTypes(path).then((types) => {
      return ParserExecuter.execAll(path, types, oldVersion, newVersion);
    });
  }

  static getTargetTypes(logPath) {
    let result = [];

    return fsp.readdir(logPath).then((files) => {
      return files.filter((file) => {
        return fs.statSync(`${logPath}/${file}`).isDirectory();
      });
    });
  }

  static fromLogFiles(oldVersion, newVersion, machine, path) {
    const id = logger.start(`parse`);
    logger.info(`log: ${path}`, true);
    return Log.toJSON(oldVersion, newVersion, path).then((json) => {
      logger.end(id);
      return new Log(oldVersion, newVersion, machine, path, json);
    });
  }

  static fromAnsibleLogFiles(input) {
    const id = logger.start('format');
    return LogFormatter.format(input, directory.tmp).then((result) => {

      const logInfo = JSON.parse(result);
      logger.info(logInfo);

      const oldVersion = logInfo.versions[0];
      const newVersion = logInfo.versions[1];

      const logs = map(logInfo.logs, (log) => {
        return Log.fromLogFiles(oldVersion, newVersion, log.machine, log.path)
      });
      logger.end(id);

      return logs;
    });
  }
}
