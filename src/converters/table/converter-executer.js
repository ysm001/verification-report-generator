'use strict';

const ConverterFactory = require('./converter-factory.js');

module.exports = class ConverterExecuter {
  constructor(type) {
    this.Converter = ConverterFactory.create(type);
  }

  exec(dataSource) {
    return (new this.Converter(dataSource)).getTableJSONs();
  }
}
