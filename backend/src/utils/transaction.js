const mongoose = require('mongoose');

// Runs fn(session) inside a MongoDB transaction. The driver retries automatically on transient errors,
// so fn may run more than once: keep all state it builds INSIDE fn. Requires a replica set
// (every MongoDB Atlas cluster, including the free one, is a replica set).
async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(
      async () => {
        result = await fn(session);
      },
      { writeConcern: { w: 'majority' } }
    );
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { runInTransaction };
