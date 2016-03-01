'use strict';

const fs = require('fs-extra');
const fsp = require('fs-promise');
const exec = require('child_process').exec;
const mkdirp = require('mkdirp');
const config = require('../config/directory.js');
const ParserExecuter = require('./parser-executer.js');
const logger = require('../libs/logger.js');
const Path = require('path');
const glob = require('glob');

module.exports = class LogFormatter {
  static format(inputPath, outputPath) {
    const query = `ruby ${config.appRoot}/scripts/formatter.rb ${inputPath} ${outputPath}`;
    mkdirp.sync(outputPath);

    logger.info(query);
    const deferred = Promise.defer();

    exec(query, (error, stdout, stderr) => {
      if (error !== null) return deferred.reject(error);
      if (stderr) return deferred.reject(stderr);
      if (stdout) deferred.resolve(stdout);
    })

    return deferred.promise;
  }
}
