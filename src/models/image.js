'use strict';

const fs = require('fs');
const fsp = require('fs-promise');
const path = require('path');
const Svgo = require('svgo');
const yaml = require('js-yaml');
const zlib = require('zlib');
const svgoConfig = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '../../config/svgo.yml'), 'utf8'));
const logger = require('../../libs/logger.js');
const svgo = new Svgo(svgoConfig);

module.exports = class Image {
  constructor(machine, type, tool, core, group, index, data, width, height, isCompressed) {
    this.machine = machine;
    this.type = type;
    this.tool = tool;
    this.core = core;
    this.group = group;
    this.index = index;
    this.data = data;
    this.width = width;
    this.height = height;
    this.isCompressed = isCompressed;
  }

  save(path) {
    return fsp.writeFile(path, this.data); 
  }

  get name() {
    return `${this.machine}_${this.tool}_${this.core}_${this.group}_${this.type}_${this.index}`;
  }

  get ext() {
    return this.isCompressed ? 'svgz' : 'svg';
  }

  static create(machine, type, tool, core, group, index, data, useCompress) {
    const useOptimize = type != 'table';

    return (useOptimize ? Image.optimize(data) : Promise.resolve({info: {}, data: data})).then((optimizedSVG) => {
      const width = optimizedSVG.info.width || 0;
      const height = optimizedSVG.info.height || 0;
      const svg = useCompress ? Image.gzip(optimizedSVG.data) : optimizedSVG.data;

      return { width: width, height: height, svg: svg};
    }).then((result) => {
      return new Image(machine, type, tool, core, group, index, result.svg, result.width, result.height, useCompress);
    });
  }

  static gzip(svg) {
    const deferred = Promise.defer();

    zlib.gzip(svg, (error, result) => {
      error ? deferred.reject(error) : deferred.resolve(result);
    });

    return deferred.promise;
  }

  static optimize(svg) {
    const deferred = Promise.defer();

    svgo.optimize(svg, (optimizedSVG) => {
      logger.info(`svg compression: ${svg.length / 1024}KB -> ${optimizedSVG.data.length / 1024}KB (${optimizedSVG.data.length * 100.0 / svg.length}%)`);
      return deferred.resolve(optimizedSVG);
    });

    return deferred.promise;
  }
}
