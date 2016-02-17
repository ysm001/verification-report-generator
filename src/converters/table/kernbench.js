'use strict';

const Table = require('./table.js');

module.exports = class KernbenchTable extends Table {
  constructor (dataSource) {
    super('kernbench', dataSource);
  }

  makeHeaders(rawJson) {
    const header = rawJson.map((t) => { return {text: `${t.thread_num} Thread`} } );
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
    const postFix = isRatioRow ? '[%]' : '[s]';

    const row = rawJson.map((t) => {
      const cls = isRatioRow ? this.getRatioClass(t[key]) : '';
      return {text: round(t[key], digit), class: cls}
    });

    return {cols: [{text: `${key} ${postFix}`}].concat(Array.prototype.concat.apply([], row))};
  }
}
