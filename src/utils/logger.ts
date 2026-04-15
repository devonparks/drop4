/**
 * Production-safe logger.
 * In __DEV__ mode: passes through to console.
 * In production: silently swallows warn/log, keeps error.
 */

const noop = (..._args: any[]) => {};

export const logger = {
  log: __DEV__ ? console.log.bind(console) : noop,
  warn: __DEV__ ? console.warn.bind(console) : noop,
  error: console.error.bind(console), // always keep errors
};
