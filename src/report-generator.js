'use strict';

const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const nestGroupBy = require('../libs/nest-groupby.js');
const util = require('util');

module.exports = class ReportGenerator {
  static generate(images) {
    const template = ReportGenerator.readTemplate().toString();
    const json = ReportGenerator.makeMustacheJSON(images);

    return mustache.to_html(template, {logs: json});
  }

  static readTemplate() {
    return fs.readFileSync(path.join(__dirname, '../data/report.template.html'));
  }

  static makeMustacheJSON(sources) {
    const byMachine = (source) => source.image.machine;
    const byType = (source) => source.image.type;
    const byTool = (source) => source.image.tool;
    const byCore = (source) => source.image.core;
    const byGroup = (source) => source.image.group;
    const byIndex = (source) => source.image.index;

    const newKeys = [
    {self: 'tool', children: 'tabs'},
    {self: 'core', children: 'groups'},
    {self: 'group', children: 'types'},
    {self: 'type', children: 'items'},
    {self: 'id', children: 'path'}
    ];

    const nestedJson = nestGroupBy(sources, [byMachine, byTool, byCore, byGroup, byType, byIndex]);
    return ReportGenerator.convertToMustacheFormat(nestedJson['hpg9-0'], newKeys);
  }

  static convertToMustacheFormat(nestedJson, newKeys) {
    if (newKeys.length == 0) {
      return nestedJson[0].path;
    }

    if (newKeys[0].self == 'type') {
      if (!('chart' in nestedJson)) {
        return null;
      }

      return {
        'chart': ReportGenerator.convertToMustacheFormat(nestedJson['chart'], newKeys.slice(1, newKeys.length)),
        'table': ReportGenerator.convertToMustacheFormat(nestedJson['table'], newKeys.slice(1, newKeys.length))
      }
    }

    return Object.keys(nestedJson).map((key) => {
      let ret = {};
      const keys = newKeys[0];

      ret[keys.self] = key;
      ret[keys.children] = ReportGenerator.convertToMustacheFormat(nestedJson[key], newKeys.slice(1, newKeys.length));

      return ret;
    });
  }

  toJSON(iamges) {
    return {
      logs: [{
        tool: 'fio',
        tabs: [{
          core: 'Max',
          groups: [{
            group: 0,
            items: [{
              id: 0,
              path: ''
            }]
          }]
        }, {
          core: 'Half'
        }]
      }, {
        tool: 'kernbench',
        tabs: [{
          core: 'Max',
        }, {
          core: 'Half'
        }]
      }, {
        tool: 'lmbench',
        tabs: [{
          core: 'Max',
        }, {
          core: 'Half'
        }]
      }, {
        tool: 'netperf',
        tabs: [{
          core: 'Max',
        }, {
          core: 'Half'
        }]
      }]
    }
  }
};
