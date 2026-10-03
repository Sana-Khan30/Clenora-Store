const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

let cachedPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
        return m;
      })
      .catch((err) => {
        cachedPromise = null;
        throw err;
      });
  }

  return cachedPromise;
}

async function disconnectDB() {
  cachedPromise = null;
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
