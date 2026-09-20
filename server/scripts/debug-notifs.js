const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const AuditLog = require('../models/AuditLog');
    const Notification = require('../models/Notification');
    const User = require('../models/User');

    const imran = await User.findOne({ email: /2401301120/i }).lean();
    console.log('Imran ID:', imran._id, 'CompanyId:', imran.companyId);

    console.log('--- NOTIFICATIONS FOR IMRAN IN NOTIFICATION COLLECTION ---');
    const notifs = await Notification.find({
      $or: [{ recipient: imran._id }, { recipientId: imran._id }, { userId: imran._id }]
    }).sort({ createdAt: -1 }).lean();
    console.log('Notifs count:', notifs.length, JSON.stringify(notifs, null, 2));

    console.log('--- ALL NOTIFICATIONS IN DB ---');
    const allNotifs = await Notification.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log('All notifs in DB count:', allNotifs.length, JSON.stringify(allNotifs, null, 2));

    console.log('--- AUDIT LOGS THAT MATCHED ---');
    const logs = await AuditLog.find({
      $or: [
        { companyId: imran.companyId },
        { actorId: imran._id },
      ]
    }).sort({ createdAt: -1 }).lean();
    console.log('Logs matching Imran/Company:', logs.length);
    logs.forEach(l => {
      console.log(`- action: ${l.action}, module: ${l.module}, details: ${l.details}, companyId: ${l.companyId}, actorId: ${l.actorId}, target: ${l.target}, createdAt: ${l.createdAt}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
