'use strict';

const mongoose = require('mongoose');
mongoose.Promise = Promise;

const env = process.env.NODE_ENV || 'development';
const appName = 'verification-report-images';

const config = {
  development: {
    name: `${appName}_development`,
    host: 'localhost',
    port: '27017',
    user: '',
    password: ''
  },
  production: {
    name: `${appName}_production`,
    host: 'localhost',
    port: '27017',
    user: '',
    password: ''
  },
  test: {
    name: `${appName}_test`,
    host: 'localhost',
    port: '27017',
    user: '',
    password: ''
  }
}[env];

mongoose.connect('mongodb://' + config.host + '/' + config.name);
module.exports = mongoose;
