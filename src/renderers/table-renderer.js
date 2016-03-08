'use strict';

const fs = require('fs');
const path = require('path');
const ConverterExecuter = require('../converters/table/converter-executer.js');
const logger = require('../../libs/logger.js');
const mustache = require('mustache');
const flatten = require('flatten');

module.exports = class TableRenderer {
  static convertToTableFormat(tool, log) {
    const executer = new ConverterExecuter(tool);
    return executer.exec(log);
  }

  static readTemplate() {
    return fs.readFileSync(path.join(__dirname, '../../templates/table.template.html'));
  }

  static render(tool, log) {
    const template = this.readTemplate().toString();
    const tableJSONs = TableRenderer.convertToTableFormat(tool, log);

    const results = Object.keys(tableJSONs).map((core) => {
      return tableJSONs[core].map((tableJSON) => {
        logger.info(`render complete: ${tool}_${core}_${tableJSON.title}`);
        const svg = mustache.to_html(template, tableJSON);
        return {
          tool: tool,
          type: 'table',
          core: core,
          group: tableJSON.title,
          index: 0,
          data: svg
        };
      });
    });

    return Promise.resolve(flatten(results));
  }
}
