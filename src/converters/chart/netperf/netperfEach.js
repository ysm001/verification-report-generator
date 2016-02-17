'use strict';

const Netperf = require('./netperf.js');

module.exports = class NetperfEach extends Netperf {
  getTarget() {
    return 'each';
  }

  formatJSONs(rawJsons) {
    const cpu_usage = rawJsons.pattern.cpu_usage;
    const targetName = 'each';

    return Object.keys(cpu_usage)
      .filter((sender_receiver) => {return cpu_usage[sender_receiver] != null && cpu_usage[sender_receiver][targetName] != null})
      .reduce((formattedJSON, sender_receiver) => {
        const target = cpu_usage[sender_receiver][targetName];
        Object.keys(target).forEach((version) => {
          Object.keys(target[version])
            .filter((item) => {return target[version][item] != null;})
            .forEach((item) => {
              formattedJSON[`${item} [${sender_receiver} ${version}]`] = this.makeGroup(item, target[version][item]);
            });
        });

        return formattedJSON;
      }, {});
  }

  makeDataset(operation, rawJson) {
    const coreNum = 16;
    const categories = Array.from(Array(coreNum).keys()).map((i) => {return `cpu${i}`});
    return categories.map((c) => {return {dataset: this.makeSeries(rawJson, c)};});
  }
}
