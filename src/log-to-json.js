'use strict';

const fs = require('fs');
const fsp = require('fs-promise');
const ParserExecuter = require('./parser-executer.js');

module.exports = class Log2JSON {
  static toJSON(logPath, oldVersion, newVersion) {
    return Log2JSON.getTargetTypes(logPath).then((types) => {
      return ParserExecuter.execAll(logPath, types, oldVersion, newVersion);
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
}
