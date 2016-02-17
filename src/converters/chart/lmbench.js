'use strict';

const Chart = require('./chart.js');
const deepcopy = require("deepcopy");

module.exports = class Lmbench extends Chart {
  constructor(dataSource) {
    'ngInject';

    super('lmbench', dataSource);
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

  getType() {
    return 'mscombidy2d'
  }

  getStyle(operation, rawJson) {
    return {
      caption: operation,
      formatNumberScale: 0,
      xAxisName: '',
      pyAxisName: this.getYAxisName(operation),
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

  formatJSONs(rawJsons) {
    const formatFuncs = {
      'File & VM system': this.formatFileVMSystemData.bind(this),
      'Processor, Processes': this.formatProcessorData.bind(this)
    };

    return Object.keys(rawJsons).reduce((result, key) => {
      if (this.isIgnored(key)) {
        return result;
      }
      
      if (key in formatFuncs) {
        const formattedData = formatFuncs[key](rawJsons, key, key);
        Object.keys(formattedData).forEach((k) => { result[k] = this.makeGroup(key, formattedData[k]) } );
      } else {
        result[key] = this.makeGroup(key, rawJsons[key]);
      }

      return result;
    }, {});
  }

  splitData(rawJsons, target, key, groups) {
    const result = {}
    const size = groups.length + 1;

    const firstKey = `${target} 1/${size}`;
    result[firstKey] = deepcopy(rawJsons[target]);

    groups.forEach((group, i) => {
      const key = `${target} ${i + 2}/${size}`;
      result[key] = {};
      group.forEach((item) => {
        result[key][item] = rawJsons[target][item];
      });
    });

    Array.prototype.concat.apply([], groups).forEach((item) => {
      delete result[firstKey][item];
    });

    return result;
  }

  formatFileVMSystemData(rawJsons, target, key) {
    const groups = [['Mmap Latency'], ['Prot Fault', 'Page Fault', '100fd selct']];
    return this.splitData(rawJsons, target, key, groups);
  }

  formatProcessorData(rawJsons, target, key) {
    const groups = [['fork proc', 'exec proc', 'sh proc']];
    return this.splitData(rawJsons, target, key, groups);
  }

  isIgnored(title) {
    const ignoredList = [
      '*Remote* Communication',
      'Basic double operations',
      'Basic float operations',
      'Basic uint64 operations',
      'Basic integer operations',
      'Basic system parameters'
    ];

    return ignoredList.indexOf(title) >= 0;
  }

  getYAxisName(operation) {
    return operation == 'process' ? 'Processing Time (μs)' : 'Latency (μs)';
  }

  makeDataset(operation, rawJson) {
    return [this.makeSeries(operation, rawJson, 'old'), this.makeSeries(operation, rawJson, 'new'), this.makeSeries(operation, rawJson, 'ratio')];
  }

  makeCategories(operation, rawJson) {
    return [{
      category: Object.keys(rawJson).map(function(k) {return {label: k }})
    }]
  }

  makeSeries(operation, rawJson, key) {
    const isRatio = key == 'ratio';
    return  {
      seriesname: key,
      renderas: isRatio ? 'line' : 'mscolumn2d',
      parentyaxis: isRatio ? 's' : 'p',
      data: isRatio ? Object.keys(rawJson).map(function(k) {return {value: 100 + rawJson[k][key]}}) : Object.keys(rawJson).map(function(k) {return {value: rawJson[k]['averages'][key]}})
    }
  }
}
