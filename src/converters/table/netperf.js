'use strict';

const Table = require('./table.js');

module.exports = class NetperfTable extends Table {
  constructor (dataSource) {
    super('netperf', dataSource);
  }

  formatJSONs(jsons) {
    return jsons.pattern.netperf;
  }

  makeHeaders(rawJson) {
    const header = Object.keys(rawJson).map((t) => { return {text: t} } );
    return [[''].concat(header)];
  }

  makeRecords(rawJson) {
    return [this.makeRow(rawJson, 'old'), this.makeRow(rawJson, 'new'), this.makeRow(rawJson, 'ratio')];
  }

  makeRow(rawJson, key) {
    const round = (val, digit) => {
      const powedDigit = Math.pow(10, digit);
      return Math.round( val * powedDigit ) / powedDigit
    };

    const isRatioRow = key == 'ratio';
    const digit = isRatioRow ? 3 : 1;
    const postFix = isRatioRow ? '[%]' : '[Mbps]';

    const row = Object.keys(rawJson).map((k) => {
      const cls = isRatioRow ? this.getRatioClass(rawJson[k][key]) : '';
      return {text: round(rawJson[k][key], digit), class: cls}
    });

    return {cols: [{text: `${key} ${postFix}`}].concat(Array.prototype.concat.apply([], row))};
  }
}
