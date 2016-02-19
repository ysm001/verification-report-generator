const Log = require('../src/models/log.js');
const Renderer = require('../src/renderers/renderer.js');
const map = require('promise-map-series');
const logger = require('../libs/logger.js');
const flatten = require('flatten');
const mkdirp = require('mkdirp');
const fs = require('fs');
const ReportGenerator = require('../src/report-generator.js');

const input = process.argv[2];
const output = process.argv[3];

const imageDirectory = `images`;
const imageOutput = `${output}/${imageDirectory}`

const reportFileName = 'report.html';

mkdirp.sync(imageOutput);

const start = Date.now();
Log.fromAnsibleLogFiles(input).then((logs) => {
  const types = ['table', 'chart'];
  return map(types, (type) => {
    return Renderer.renderLogs(type, logs)
  }).then(flatten);
}).then((images) => {
  logger.info(`------------------------ save files -------------------------`, true);
  return map(images, (image) => {
    const fileName = `${image.name}.${image.ext}`
    const path = `${imageOutput}/${fileName}`;
    return image.save(path).then(() => {
      logger.info(`saved: ${path}`);
      return { path: `./${imageDirectory}/${fileName}`, image: image };
    });
  });
}).then((results) => {
  const html = ReportGenerator.generate(results);
  fs.writeFileSync(`${output}/${reportFileName}`, html);

  logger.info('');
  logger.info(`finish (process time: ${(Date.now() - start) / 1000} sec)`, true);
  logger.info('');
}).catch((err) => {
  console.error(err.stack);
});

