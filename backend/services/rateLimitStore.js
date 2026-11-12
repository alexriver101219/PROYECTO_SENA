const RateLimit = require("../models/RateLimit");
const mongoose = require("mongoose");
// Ventanas compartidas entre instancias; el índice TTL se crea en la migración.
class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
  }
  init(options) {
    this.windowMs = options.windowMs;
  }
  async increment(key) {
    const window = Math.floor(Date.now() / this.windowMs);
    const resetTime = new Date((window + 1) * this.windowMs);
    const record = await RateLimit.findOneAndUpdate(
      { _id: this.prefix + ":" + key + ":" + window },
      { $inc: { hits: 1 }, $setOnInsert: { resetTime } },
      { upsert: true, returnDocument: "after" },
    );
    return { totalHits: record.hits, resetTime: record.resetTime };
  }
  async decrement(key) {
    const window = Math.floor(Date.now() / this.windowMs);
    await RateLimit.updateOne(
      {
        _id: this.prefix + ":" + key + ":" + window,
        hits: mongoose.trusted({ $gt: 0 }),
      },
      { $inc: { hits: -1 } },
    );
  }
  async resetKey(key) {
    const window = Math.floor(Date.now() / this.windowMs);
    await RateLimit.deleteOne({ _id: this.prefix + ":" + key + ":" + window });
  }
}
module.exports = { MongoRateLimitStore };
