'use strict';

const Chart = require('./chart.js');

module.exports = class Kernbench extends Chart {
  constructor(dataSource) {
    'ngInject';

    super('kernbench', dataSource);
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

  formatJson(rawJson) {
    return Array.prototype.concat.apply([], rawJson);
  }

  getType() {
    return 'mscombidy2d'
  }

  getStyle(operation, rawJson) {
    return {
      caption: operation,
      xAxisName: 'Number of Threads',
      pyAxisName: 'Average Compile Time (s)',
      syAxisName: 'Performance Ratio (%)',
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


  makeDataset(operation, throughputs) {
    return [this.makeSeries(throughputs, 'old'), this.makeSeries(throughputs, 'new'), this.makeSeries(throughputs, 'ratio')]
  }

  makeCategories(operation, throughputs) {
    return [{
      category: throughputs.map(function(t) {return {label: t.thread_num.toString() }})
    }]
  }

  makeSeries(throughputs, key) {
    const isRatio = key == 'ratio';

    return  {
      seriesname: key,
      renderas: isRatio ? 'line' : 'mscolumn2d',
      parentyaxis: isRatio ? 's' : 'p',
      data: isRatio ? throughputs.map(function(t) {return {value: 100 + t[key]}}) : throughputs.map(function(t) {return {value: t[key]}})
    }
  }
}
