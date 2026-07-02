require('dotenv').config();
const mongoose = require('mongoose');

async function testDB() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MONGO_URI:', process.env.MONGO_URI);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected!');
    console.log('Host:', conn.connection.host);
    console.log('DB:', conn.connection.name);
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

testDB();