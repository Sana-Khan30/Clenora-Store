const env = require('./config/env');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Check MONGODB_URI, your Atlas database user, and Atlas Network Access (IP allow list).');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  function shutdown(signal) {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
