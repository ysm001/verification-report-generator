'use strict';

const Chart = require('../chart.js');

module.exports = class Netperf extends Chart {
  constructor (dataSource) {
    'ngInject';

    super('netperf', dataSource);
  }

  getType() {
    return 'msstackedcolumn2d';
  }

  getStyle(operation) {
    return {
      caption: operation,
      xAxisName: '',
      yAxisName: 'CPU Usage (%)',
      showValues: 0
    };
  }

  getItems() {
    return [
      '%gnice',
      '%guest',
      '%iowait',
      '%irq',
      '%nice',
      '%soft',
      '%steal',
      '%sys',
      '%usr'
    ];
  }

  formatJSONs(rawJsons) {
    const cpu_usage = rawJsons.pattern.cpu_usage;
    const targetName = 'all';

    return Object.keys(cpu_usage)
      .filter((sender_receiver) => {return cpu_usage[sender_receiver] != null && cpu_usage[sender_receiver][targetName] != null})
      .reduce((formattedJSON, sender_receiver) => {
        const target = cpu_usage[sender_receiver][targetName];
        Object.keys(target)
          .filter((item) => {return target[item] != null;})
          .forEach((item) => {
            formattedJSON[`${item} [${sender_receiver}]`] = this.makeGroup(item, target[item]);
          });

        return formattedJSON;
      }, {});
  }

  getTarget() {
    return 'all';
  }

  makeDataset(operation, rawJson) {
    return [{dataset: this.makeSeries(rawJson, 'old')}, {dataset: this.makeSeries(rawJson, 'new')}];
  }

  makeCategories(operation, rawJson) {
    if (rawJson == null) return;

    return [{
      category: Object.keys(rawJson).map((k) => {return {label: k};})
    }];
  }

  makeSeries(rawJson, key) {
    return this.getItems().map((item) => {
      const data = Object.keys(rawJson).map((k) => {
        return (key in rawJson[k]) ? {value: rawJson[k][key][item]} : {value: 0};
      });

      return {
        seriesname: item,
        data: data
      }
    });
  }
}
