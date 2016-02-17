'use strict';

const fs = require('fs-extra');
const fsp = require('fs-promise');
const exec = require('child_process').exec;
const mkdirp = require('mkdirp');
const config = require('../config/directory.json');
const ParserExecuter = require('./parser-executer.js');
const LogPath = require('./log-path.js');
const Path = require('path');
const glob = require('glob');

module.exports = class LogFormatter {
  static formatArchivedFile(archive) {
    return this.save(archive).then((path) => {
      return LogFormatter.cleanUpUnarchivedDirectory(path.unarchivedPath);
    }).then((unarchivedPath) => {
      return LogFormatter.format(unarchivedPath, `${config.logsDir}/format/${Path.basename(archive.originalname, '.zip')}_${Date.now()}`);
    }).then((result) => {
      return JSON.parse(result);
    });
  }

  static format(inputPath, outputPath) {
    const query = `ruby scripts/formatter.rb ${inputPath} ${outputPath}`;
    mkdirp.sync(outputPath);

    console.log(query);
    const deferred = Promise.defer();

    exec(query, (error, stdout, stderr) => {
      if (error !== null) return deferred.reject(error);
      if (stderr) return deferred.reject(stderr);
      if (stdout) deferred.resolve(stdout);
    })

    return deferred.promise;
  }

  static save(archive) {
    return LogFormatter.saveToTmpDir(archive).then((logPath) => {
      const unarchivedPath = `${logPath.path}/unarchived`;
      const outputdPath = `${logPath.path}/formatted`;
      const logFilePath = `${logPath.path}/${logPath.fileName}`;

      return LogFormatter.unzip(logFilePath, unarchivedPath);
    });
  }

  static cleanUpUnarchivedDirectory(unarchivedPath) {
    return LogFormatter.removeFiles(unarchivedPath, '**/!(*.tar.bz2)', {dot: true, fileOnly: true}).then(() => {
      return LogFormatter.removeFiles(unarchivedPath, '!(netperf|kernbench|fio|lmbench)');
    }).then(() => {
      return LogFormatter.removeFiles(unarchivedPath, '*/*/!(*.tar.bz2)');
    }).then(() => {
      return unarchivedPath;
    });
  }

  static removeFiles(targetPath, filename, options) {
    const deferred = Promise.defer();

    console.log(`${targetPath}/${filename}`);
    glob(`${targetPath}/${filename}`, options, (err, files) => {
      if (err) return deferred.reject(err);

      files.filter((file) => {
        return !(options && options.fileOnly && fs.statSync(file).isDirectory());
      }).forEach((file) => {
        fs.removeSync(file);
        console.log(`removed: ${file}`);
      });

      deferred.resolve(files);
    })

    return deferred.promise;
  }

  static unzip(archivePath, outputPath) {
    mkdirp.sync(outputPath);

    const query = `unzip ${archivePath} -d ${outputPath}`;
    console.log(query);

    const deferred = Promise.defer();
    exec(query, (error, stdout, stderr) => {
      if (error !== null) return deferred.reject(error);
      if (stderr) deferred.reject(stderr);

      deferred.resolve({archivePath: archivePath, unarchivedPath: outputPath});
    });

    return deferred.promise;
  }

  static saveToTmpDir(archive) {
    const fileName = archive.originalname;
    const logPath = `${config.tmpDir}/format/${Path.basename(archive.originalname, '.zip')}_${Date.now()}`;
    const logFilePath = `${logPath}/${fileName}`;

    if (!fs.existsSync(logPath)) {
      mkdirp.sync(logPath);
    }

    return fsp.writeFile(logFilePath, archive.buffer).then(() => {
      return {
        path: logPath,
        fileName: fileName
      };
    });
  }
}
