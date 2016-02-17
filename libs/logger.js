'use strict';

const Color = {
  black   : '\u001b[30m',
  red     : '\u001b[31m',
  green   : '\u001b[32m',
  yellow  : '\u001b[33m',
  blue    : '\u001b[34m',
  magenta : '\u001b[35m',
  cyan    : '\u001b[36m',
  white   : '\u001b[37m',
  reset   : '\u001b[0m'
}

class Logger {
  info(text, useColor) {
    this.print(console.info, text, useColor ? Color.blue : Color.reset);
  }

  infoBlock(text) {
    this.info('------------------ info ------------------', true);
    this.info(text);
    this.info('------------------------------------------', true);
    this.info('');
  }

  print(func, text, color) {
    func(color, text, Color.reset);
  }
}

module.exports = new Logger();
