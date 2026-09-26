#!/usr/bin/env node
'use strict';

const { createApp } = require('./src/server/app');

function startServer(options = {}) {
  const runtime = createApp(options);
  const logger = options.logger || console;
  const server = runtime.app.listen(runtime.config.port, () => {
    logger.log(`LATFS listening on port ${server.address().port}`);
  });
  let stopping = false;
  function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    logger.log(`[${signal}] Shutting down gracefully`);
    const timeout = setTimeout(() => {
      server.closeAllConnections?.();
      runtime.close();
      process.exitCode = 1;
    }, 10000);
    timeout.unref();
    server.close((error) => {
      clearTimeout(timeout);
      runtime.close();
      if (error) process.exitCode = 1;
    });
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  server.once('close', () => {
    process.removeListener('SIGTERM', shutdown);
    process.removeListener('SIGINT', shutdown);
  });
  server.once('error', (error) => {
    runtime.close();
    logger.error('Server failed to start:', error.message);
    process.exitCode = 1;
  });
  return { ...runtime, server, shutdown };
}

if (require.main === module) {
  try {
    startServer();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createApp, startServer };
