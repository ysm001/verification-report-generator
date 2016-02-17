'use strict';

const Chart = require('../chart.js');

module.exports = class NetperfTime extends Chart {
  constructor (dataSource) {
    'ngInject';

    super('netperf', dataSource);
  }

  getFushionFormatJSONResult(type, chart, categories, data) {
    return {
      type: type,
      chart: chart,
      categories: categories,
      dataset: data,
      trendlines: this.makeBorders()
    };
  }

  formatJSONs(rawJsons) {
    const netperf = rawJsons.pattern.netperf;

    return Object.keys(netperf).reduce((result, key) => {
      result[key] = this.makeGroup(key, netperf[key]);
      return result;
    }, {});
  }

  formatJson(rawJson) {
    return Array.prototype.concat.apply([], rawJson);
  }

  getStyle(operation, rawJson) {
    return {
      caption: operation,
      xAxisName: '',
      pyAxisName: 'Throughput (Mbps)',
      syAxisName: 'Performance Ratio (%)',
      formatNumberScale: 0,
      numDivLines: 6,
      syAxisMaxValue: Math.max(115, Math.floor(this.getMaxValue(rawJson))),
      syAxisMinValue: Math.min(85, Math.floor(this.getMinValue(rawJson)))
    };
  }

  getValues(rawJson) {
    return Object.keys(rawJson).map((k) => {return 100 + rawJson[k].ratio});
  }

  getMinValue(rawJson) {
    return Math.min.apply(null, this.getValues(rawJson));
  }

  getMaxValue(rawJson) {
    return Math.max.apply(null, this.getValues(rawJson));
  }

  getType() {
    return 'mscombidy2d';
  }

  getKeys(rawJson) {
    return Object.keys(rawJson).sort((a, b) => {
      return a.length == b.length ? (a < b ? -1 : 1) : (a.length < b.length ? -1 : 1);
    });
  }

  makeDataset(operation, rawJson) {
    return [this.makeSeries(rawJson, 'old'), this.makeSeries(rawJson, 'new'), this.makeSeries(rawJson, 'ratio')]
  }

  makeCategories(operation, rawJson) {
    return [{
      category: this.getKeys(rawJson).map(function(k) {return {label: k}})
    }]
  }

  makeSeries(rawJson, key) {
    const isRatio = key == 'ratio';

    return  {
      seriesname: key,
      renderas: isRatio ? 'line' : 'mscolumn2d',
      parentyaxis: isRatio ? 's' : 'p',
      data: isRatio ? this.getKeys(rawJson).map(function(k) {return {value: rawJson[k][key] + 100}}) : this.getKeys(rawJson).map(function(k) {return {value: rawJson[k][key]}})
    }
  }
}
