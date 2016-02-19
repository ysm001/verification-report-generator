'use strict';

const fs = require('fs');
const fsp = require('fs-promise');
const ParserExecuter = require('../parser-executer.js');
const LogFormatter = require('../log-formatter.js');
const config = require('../../config/directory.json');
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
    logger.info(`parse ${path}`, true);
    return Log.toJSON(oldVersion, newVersion, path).then((json) => {
      logger.info('finish', true);
      logger.infoBlock(json);
      return new Log(oldVersion, newVersion, machine, path, json);
    });
  }

  static fromAnsibleLogFiles(input) {
    logger.info('format from ansible format logs to parsable format logs', true);
    return LogFormatter.format(input, config.tmpDir).then((result) => {
      logger.info('finish', true);

      const logInfo = JSON.parse(result);
      logger.infoBlock(logInfo);

      const oldVersion = logInfo.versions[0];
      const newVersion = logInfo.versions[1];

      return map(logInfo.logs, (log) => {
        return Log.fromLogFiles(oldVersion, newVersion, log.machine, log.path)
      });
    });
  }
}
