'use strict';

const fs = require('fs');
const path = require('path');

module.exports = class PromiseDir {
  static getDirs(root) {
    return new Promise((resolve, reject) => {
      fs.readdir(root, (err, files) => {
        if (err) return reject(err);

        const dirs = files.map((file) => {
          return path.join(root, file);
        }).filter((file) => {
          return fs.statSync(file).isDirectory();
        });

        resolve(dirs);
      })
    });
  }
}
