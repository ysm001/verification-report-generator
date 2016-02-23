'use strict';

const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const nestGroupBy = require('../libs/nest-groupby.js');
const util = require('util');

module.exports = class ReportGenerator {
  static generate(images) {
    const template = ReportGenerator.makeTemplate();
    const jsons = ReportGenerator.makeMustacheJSON(images);

    return jsons.map((json) => {
      const html = mustache.to_html(template, { logs: json.data });
      return { machine: json.machine, data: html };
    });
  }

  static makeTemplate() {
    const template = fs.readFileSync(path.join(__dirname, '../data/report-template/report.template.html')).toString();
    const json = {
      body: fs.readFileSync(path.join(__dirname, '../data/report-template/report.body.html')).toString(),
      css: fs.readFileSync(path.join(__dirname, '../data/report-template/report.css')).toString(),
      script: fs.readFileSync(path.join(__dirname, '../data/report-template/report.js')).toString()
    }

    return mustache.to_html(template, json);
  }

  static makeMustacheJSON(images) {
    const byMachine = (image) => image.machine;
    const byType = (image) => image.type;
    const byTool = (image) => image.tool;
    const byCore = (image) => image.core;
    const byGroup = (image) => image.group;
    const byIndex = (image) => image.index;

    const newKeys = [
    {self: 'tool', children: 'tabs'},
    {self: 'core', children: 'groups'},
    {self: 'group', children: 'types'},
    {self: 'type', children: 'items'},
    {self: 'id', children: 'data'}
    ];

    const nestedJson = nestGroupBy(images, [byMachine, byTool, byCore, byGroup, byType, byIndex]);

    return Object.keys(nestedJson).map((machine) => {
      const json = ReportGenerator.convertToMustacheFormat(nestedJson[machine], newKeys);
      return { machine: machine, data: json };
    });
  }

  static convertToMustacheFormat(nestedJson, newKeys) {
    if (newKeys.length == 0) {
      return nestedJson[0].data;
    }

    if (newKeys[0].self == 'type') {
      if (!('chart' in nestedJson)) {
        return null;
      }

      return {
        'chart': ReportGenerator.convertToMustacheFormat(nestedJson['chart'], newKeys.slice(1, newKeys.length)),
        'table': ('table' in nestedJson) ? ReportGenerator.convertToMustacheFormat(nestedJson['table'], newKeys.slice(1, newKeys.length)) : null
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
};
