const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
let memory;
beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "sesha-test-only-secret-with-more-than-32-bytes";
  process.env.APP_ORIGIN = "http://localhost:5173";
  memory = await MongoMemoryServer.create({
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
