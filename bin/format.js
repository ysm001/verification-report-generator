const LogFormatter = require('../src/log-formatter.js');
const Log2JSON = require('../src/log-to-json.js');
const logger = require('../libs/logger.js');

const input = process.argv[2];
const output = process.argv[3];

logger.info('format from ansible format logs to parsable format logs...', true);
return LogFormatter.format(input, output).then((result) => {
  logger.info('finish', true);

  const logInfo = JSON.parse(result);
  logger.infoBlock(logInfo);

  const oldVersion = logInfo.versions[0];
  const newVersion = logInfo.versions[1];

  logger.info('parse log files...', true);
  return Promise.all(logInfo.logs.map((log) => Log2JSON.toJSON(log.path, oldVersion, newVersion)));
}).then((result) => {
  logger.info('finish', true);
  logger.infoBlock(result);
}).catch((err) => {
  console.error(err.stack);
});
