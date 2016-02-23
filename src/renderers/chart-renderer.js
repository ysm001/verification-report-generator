'use strict';

const fs = require('fs');
const ConverterExecuter = require('../converters/chart/converter-executer.js');
const fc2svg = require('fusioncharts2svg');
const map = require('promise-map-series');
const logger = require('../../libs/logger.js');

module.exports = class ChartRenderer {
  static convertToFusionchartsFormat(tool, log) {
    const executer = new ConverterExecuter(tool);
    return executer.exec(log);
  }

  static makeChart(dataSource) {
    return {
      dataFormat: 'json',
      width: 600,
      height: 400,
      type: dataSource.type,
      dataSource: dataSource,
    };
  }

  static parametalize(fusionchartsJSON) {
    let results = [];
    Object.keys(fusionchartsJSON).forEach((core) => {
      Object.keys(fusionchartsJSON[core]).forEach((group) => {
        fusionchartsJSON[core][group].forEach((dataSource, idx) => {
          results.push({core: core, group: group, idx: idx, dataSource: dataSource});
        });
      });
    });

    return results;
  }

  static render(tool, log) {
    const fusionchartsJSON = ChartRenderer.convertToFusionchartsFormat(tool, log);
    const parameters = ChartRenderer.parametalize(fusionchartsJSON);

    return map(parameters, (param) => {
      logger.info(`rendering...: ${tool}_${param.core}_${param.group}_${param.idx}`);
      return fc2svg.fromObject(this.makeChart(param.dataSource)).then((svg) => {
        logger.info(`render complete: ${tool}_${param.core}_${param.group}_${param.idx}`);
        return {
          tool: tool,
          type: 'chart',
          core: param.core,
          group: param.group,
          index: param.idx,
          data: svg
        };
      });
    });
  }
}
