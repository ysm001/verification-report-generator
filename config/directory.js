'use strict';

const path = require('path');
const appRoot = path.resolve(path.join(__dirname, '../'));

module.exports = {
  appRoot: appRoot,
  tmp: `${appRoot}/tmp`
}
