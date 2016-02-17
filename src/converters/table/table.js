'use strict';

module.exports = class Table {
  constructor (type, dataSource) {
    this.type = type;
    this.threthold = 10;
    this.dataSource = dataSource;
  }

  getTableJSONs() {
    return Object.keys(this.dataSource).reduce((result, tab) => {
      const rawJsons = this.formatJSONs(this.dataSource[tab]);

      result[tab] = Object.keys(rawJsons).map((key) => {
        return {
          title: key,
          headers: this.makeHeaders(rawJsons[key]),
          records: this.makeRecords(rawJsons[key])
        }
      });

      return result;
    }, {});
  }

  formatJSONs(jsons) {
    return jsons;
  }

  makeHeaders() {
    return [];
  }

  makeRecords() {
    return [];
  }

  getRatioClass(ratio) {
    if (ratio < -this.threthold) {
      return 'detail-table-col-bad';
    } else if (ratio > this.threthold) {
      return 'detail-table-col-good';
    }

    return '';
  }
}
