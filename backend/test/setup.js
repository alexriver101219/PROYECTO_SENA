const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
let memory;
beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.ALLOW_SELF_REGISTRATION = "true";
  process.env.SEED_ADMIN_PASSWORD = "test-only-fixture-0-credentials";
  process.env.SEED_CARLOS_PASSWORD = "test-only-fixture-1-credentials";
  process.env.SEED_LAURA_PASSWORD = "test-only-fixture-1-credentials";
  process.env.JWT_SECRET = "sesha-test-only-secret-with-more-than-32-bytes";
  process.env.APP_ORIGIN = "http://localhost:5173";
  memory = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: {
      downloadDir: require("path").resolve(
        __dirname,
        "../../.mongodb-binaries",
      ),
    },
  });
  process.env.MONGO_URI = memory.getUri("sesha_test");
  await mongoose.connect(process.env.MONGO_URI);
  for (const Model of Object.values(mongoose.models))
    await Model.createIndexes();
}, 120000);
beforeEach(async () => {
  for (const collection of Object.values(mongoose.connection.collections))
    await collection.deleteMany({});
});
afterAll(async () => {
  await mongoose.disconnect();
  if (memory) await memory.stop();
});
