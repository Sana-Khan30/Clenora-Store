const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

async function connectDB() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
