'use strict';

const ConverterFactory = require('./converter-factory.js');

module.exports = class ConverterExecuter {
  constructor(tool) {
    this.converters = ConverterFactory.create(tool);
  }

  exec(dataSource) {
    const nestedChartJsons = this.converters.map((Converter) => {
      return (new Converter(dataSource)).getFushionFormatJSONs();
    });

    const nestedTabs = Array.prototype.concat.apply([], nestedChartJsons);

    return nestedTabs.reduce((result, tab) => {
      result[tab.tab] = result[tab.tab] || {};

      Object.keys(tab.jsons).forEach((key) => {
        result[tab.tab][this.makeUniqueKey(key, result[tab.tab])] = tab.jsons[key];
      });

      return result;
    }, {});
  }

  makeUniqueKey(key, object) {
    const maxIter = 16;
    const candidates = Array.from(Array(maxIter).keys()).map((i) => {
      return i == 0 ? key : `${key}_${i}`;
    });

    return candidates.filter((key) => {
      return !(key in object)
    })[0];
  }
}
