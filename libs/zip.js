'use strict';

const JSZip = require('jszip');

module.exports = class Zip {
  unzip (zipFile) {
    const zip = new JSZip(zipFile);
    const zipObject = this.zipToObject(zip.files);

    return zipObject;
  }

  zipToObject(files) {
    files['/'] = { name: '/', dir: true, root: true };
    Object.keys(files).forEach((key) => {
      const file = files[key];
      if (file.root) return;

      this.appendFileObject(files, file);
    });

    return files['/'].children;
  }

  appendFileObject(files, file) {
    const directory = `${this.getDirectory(file)}/`;

    if (files[directory].children == null) {
      files[directory].children = {};
    }

    files[directory].children[this.getFileName(file)] = file;
  }

  getFileName(file) {
    const pathArr = file.name.split('\\').pop().split('/');

    return file.dir ? pathArr[pathArr.length - 2] : pathArr[pathArr.length - 1];
  }

  getDirectory(file) {
    let pathArr = file.name.split('\\').pop().split('/');

    pathArr.pop();
    if (file.dir) pathArr.pop();

    return pathArr.join('/');
  }
}
