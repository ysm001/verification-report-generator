'use strict';

const Image = require('../models/image.js');

const ChartRenderer = require('./chart-renderer.js');
const TableRenderer = require('./table-renderer.js');
const map = require('promise-map-series');
const logger = require('../../libs/logger.js');

const renderers = {
  'chart': ChartRenderer,
  'table': TableRenderer
};

module.exports = class Renderer {
  static render(machine, type, tool, dataSource) {
    return renderers[type].render(tool, dataSource).then((results) => {
      return map(results, (result) => {
        return Image.create(machine, type, result.tool, result.core, result.group, result.index, result.data);
      });
    });
  }

  static renderLogs(type, logs) {
    return map(logs, (log) => {
      return map(Object.keys(log.json), (tool) => {
        logger.info(`---------- render (${log.machine} ${tool} ${type}) ----------`, true);
        return Renderer.render(log.machine, type, tool, log.json[tool]);
      });
    });
  }
}
