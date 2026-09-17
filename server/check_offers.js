const mongoose = require('mongoose');
require('dotenv').config();
const Application = require('./models/Application');
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const app = await Application.findById('6aa05a72811f03c7e086c4af').populate('candidateId');
  console.log('App 6aa05a72811f03c7e086c4af candidate:', app.candidateId?.fullName, app.candidateId?.email);
  process.exit(0);
}
test();
