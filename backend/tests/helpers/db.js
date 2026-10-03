const mongoose = require('mongoose');

async function connectTestDb() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const name = mongoose.connection.name;
  if (!name.endsWith('_test')) {
    await mongoose.disconnect();
    throw new Error(`Refusing to run tests on database "${name}": the test database name must end with _test`);
  }
}

async function clearDb() {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
}

async function closeDb() {
  await mongoose.disconnect();
}

module.exports = { connectTestDb, clearDb, closeDb };
