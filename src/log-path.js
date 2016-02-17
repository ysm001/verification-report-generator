'use strict';

const fs = require('fs');
const config = require('../config/directory.json');

module.exports = class LogPath {
  static makePath(root, jenkinsJobName, jenkinsBuildNumber) {
    return `${root}/${jenkinsJobName}-${jenkinsBuildNumber}`;
  }

  static makeTmpPath(jenkinsJobName, jenkinsBuildNumber) {
    const name = Date.now().toString();
    const path = LogPath.makePath(config.tmpDir, jenkinsJobName, jenkinsBuildNumber);

    return `${path}-${name}`;
  }

  static makeLogPath(jenkinsJobName, jenkinsBuildNumber) {
    const name = Date.now().toString();
    const path = LogPath.makePath(config.logsDir, jenkinsJobName, jenkinsBuildNumber);

    return `${path}-${name}`;
  }
}
