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

const start = Date.now();
Log.fromAnsibleLogFiles(input).then((logs) => {
  const types = ['table', 'chart'];
  return map(types, (type) => {
    return Renderer.renderLogs(type, logs)
  }).then(flatten);
}).then((results) => {
  const htmls = ReportGenerator.generate(results);
  htmls.forEach((html) => {
    const reportFilePath = path.resolve(`${output}/report-${html.machine}-${Date.now()}.html`);
    fs.writeFileSync(reportFilePath, html.data);
    logger.info(`report file: ${reportFilePath}`, true);
  });

  logger.info('');
  logger.info(`finish (process time: ${(Date.now() - start) / 1000} sec)`, true);
  logger.info('');
}).catch((err) => {
  console.error(err.stack);
});

