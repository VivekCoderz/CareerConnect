const { MongoMemoryServer } = require("mongodb-memory-server");

async function prepareTestMongoDB() {
  let mongod;

  try {
    mongod = await MongoMemoryServer.create();
    console.log("MongoDB test binary is ready.");
  } finally {
    if (mongod) await mongod.stop();
  }
}

prepareTestMongoDB().catch((error) => {
  console.error(`Unable to prepare the MongoDB test binary: ${error.message}`);
  process.exitCode = 1;
});
