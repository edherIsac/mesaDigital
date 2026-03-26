import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

async function run() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/misesionpro';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  try {
    const coll = mongoose.connection.collection('orders');
    const filter = { currency: { $in: ['USD', 'usd', '$', 'US'] } };
    const update = { $set: { currency: 'MXN' } };
    const res = await coll.updateMany(filter, update);
    console.log(`Matched: ${res.matchedCount}, Modified: ${res.modifiedCount}`);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
