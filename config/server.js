'use strict';

const env = process.env.NODE_ENV || 'development';

module.exports = {
  development: {
    port: '8585',
  },
  production: {
    port: '8585',
  },
  test: {
    port: '8585',
  }
}[env];
