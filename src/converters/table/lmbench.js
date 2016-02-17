'use strict';

const Table = require('./table.js');

module.exports = class LmbenchTable extends Table {
  constructor (dataSource) {
    super('lmbench', dataSource);
  }

  makeHeaders(rawJson) {
    const sample = rawJson[Object.keys(rawJson)[0]];
    const indexes = Array.apply(null, {length: sample.values.length}).map(Number.call, Number)
    const old_indexes = indexes.map((i) => { return `old ${i + 1}` } );
    const new_indexes = indexes.map((i) => { return `new ${i + 1}` } );

    const old_ave_header = [{text: 'old ave [μs]'}];
    const old_header = old_indexes.map((t) => { return {text: t} });
    const new_header = new_indexes.map((t) => { return {text: t} });
    const ratio_header = [{text: 'ratio [%]'}];
    const new_ave_header = [{text: 'new ave [μs]', class: 'lmbench-ave-col'}];
    const empty_header = [{text: ''}];

    return [empty_header.concat(old_ave_header).concat(old_header).concat(new_ave_header).concat(new_header).concat(ratio_header)];
  }

  makeRecords(rawJson) {
    const round = (val, digit) => {
      const powedDigit = Math.pow(10, digit);
      return Math.round( val * powedDigit ) / powedDigit
    };

    return Object.keys(rawJson).map((k) => { 
      const digit = 3;
      const cols = rawJson[k];
      const old_cols = cols.values.map((col) => {return {text: round(col.old, digit)}})
      const new_cols = cols.values.map((col) => {return {text: round(col.new, digit)}})
      const average_cols = [{text: round(cols.averages.new, digit), class: 'lmbench-ave-col'}];
      const ratio_cols = [{text: round(cols.ratio, digit), class: this.getRatioClass(cols.ratio)}];

      const all_cols = [{text: k}, {text: round(cols.averages.old, digit)}]
      .concat(old_cols)
      .concat(average_cols)
      .concat(new_cols)
      .concat(ratio_cols);

      return { cols:  all_cols };
    });
  }
}
