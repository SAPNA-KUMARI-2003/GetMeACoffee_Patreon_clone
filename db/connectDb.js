
import mongoose from "mongoose";

// Reuse cached connection during development to prevent exhausting connections
let cached = global.mongooseCache;
if (!cached) cached = global.mongooseCache = { conn: null, promise: null };

const connectDb = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      const msg = "Missing MONGODB_URI environment variable. Please add it to your .env.local (or set it in your hosting platform) and restart the dev server.";
      console.error(msg);
      throw new Error(msg);
    }

    const opts = {
      // set DB name explicitly to 'coffee'
      dbName: process.env.MONGODB_DBNAME || 'coffee',
      // recommended options
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log(`MongoDB Connected: ${cached.conn.connection.host} (db: ${cached.conn.connection.name})`);
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

export default connectDb;