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

const MAX_BLOCK_LENGTH = 80;
class Logger {
  constructor() {
    this.timers = [];
  }

  startTimer(text) {
    const timerId = Date.now();
    this.timers[timerId] = { text: text, time: Date.now() };

    return timerId;
  }

  stopTimer(id) {
    const timer = this.timers[id];

    return {
      text: timer.text,
      time: Date.now() - timer.time 
    };
  }

  info(text, useColor) {
    this.print(console.info, text, useColor ? Color.blue : Color.reset);
  }

  error(text) {
    this.print(console.error, text, Color.red);
  }

  start(text) {
    this.info(this.makePaddingText(`start ${text}`), true);

    return this.startTimer(text);
  }

  end(id) {
    const timer = this.stopTimer(id);

    this.info(this.makePaddingText(`end ${timer.text} (${timer.time} ms)`), true);
    this.info('');
    this.info('');
  }

  print(func, text, color) {
    func(color, text, Color.reset);
  }

  makePadding(char, n) {
    return Array(n + 1).join(char);
  }

  makePaddingText(text) {
    const paddingLength = parseInt((MAX_BLOCK_LENGTH - text.length) / 2);
    const padding = this.makePadding('-', paddingLength);
    return `${padding} ${text} ${padding}`;
  }
}

module.exports = new Logger();
