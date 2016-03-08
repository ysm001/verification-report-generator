const Log = require('../src/models/log.js');
const Renderer = require('../src/renderers/renderer.js');
const map = require('promise-map-series');
const logger = require('../libs/logger.js');
const flatten = require('flatten');
const mkdirp = require('mkdirp');
const fs = require('fs');
const ReportGenerator = require('../src/report-generator.js');
const path = require('path');

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.log(`usage: ${process.argv[1]} input output`);
  process.exit(1);
}

mkdirp.sync(output);

const render = (logs) => map(['table', 'chart'], (type) => {
  return Renderer.renderLogs(type, logs)
}).then(flatten);

const createImages = (input) => Log.fromAnsibleLogFiles(input).then((logs) => render(logs).then(images => ({
  oldVersion: logs[0].oldVersion,
  newVersion: logs[1].newVersion,
  data: images
})));

const makeReportFilePath = (base, machineName, oldVersion, newVersion, timestamp) => {
  return path.resolve(`${base}/${machineName}-${oldVersion}_vs_${newVersion}-${timestamp}.html`)
}

const generateReports = (images) => {
  const htmls = ReportGenerator.generate(images.data);
  const timestamp = Date.now();

  htmls.forEach((html) => {
    const reportFilePath = makeReportFilePath(output, html.machine, images.oldVersion, images.newVersion, timestamp);
    fs.writeFileSync(reportFilePath, html.data);
    logger.info(`report file: ${reportFilePath}`, true);
  });
};

const start = Date.now();
createImages(input).then(generateReports).then(() => {
  logger.info('');
  logger.info(`finish (process time: ${(Date.now() - start) / 1000} sec)`, true);
  logger.info('');
}).catch((err) => {
  logger.error(err);
  logger.error(err.stack);
});
