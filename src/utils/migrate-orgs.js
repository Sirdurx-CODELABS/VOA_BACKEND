/**
 * Migration: Multi-Tenant Alliance Organizations
 *
 * Run with: node src/utils/migrate-orgs.js
 *
 * What it does:
 * 1. Creates the default VOA AllianceOrganization (if it doesn't exist)
 * 2. Assigns all existing users to the VOA organization
 * 3. Migrates SystemInfo data into the VOA org
 * 4. Ensures backward compatibility — no data loss
 */
require('dotenv').config();
const mongoose = require('mongoose');
const AllianceOrganization = require('../models/AllianceOrganization');
const User = require('../models/User');
const SystemInfo = require('../models/SystemInfo');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`\n${C.green}✔ Connected to MongoDB${C.reset}\n`);

    // ── Step 1: Create or find VOA organization ──────────────────────────────
    let voaOrg = await AllianceOrganization.findOne({ organizationName: 'Voice of Adolescents' });
    if (!voaOrg) {
      // Load SystemInfo to seed the VOA org
      const sysInfo = await SystemInfo.findOne().lean();

      voaOrg = await AllianceOrganization.create({
        organizationName: 'Voice of Adolescents',
        shortName: 'VOA',
        organizationType: 'ngo',
        facilityType: 'headquarters',
        district: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        address: sysInfo?.address || 'SS.Wali Aminu Kano Teaching Hospitals, Kano State, Nigeria',
        contactEmail: sysInfo?.email || 'voiceofadolescence1@gmail.com',
        contactPhone: sysInfo?.phone || '+234 8143705588',
        website: sysInfo?.website || 'www.voiceofadolescent.org',
        primaryColor: '#1E3A8A',
        secondaryColor: '#F97316',
        accentColor: '#22C55E',
        description: 'Voice of Adolescents — umbrella organization for the VOA Alliance Network.',
        status: 'active',
        systemInfo: {
          email: sysInfo?.email || '',
          phone: sysInfo?.phone || '',
          address: sysInfo?.address || '',
          website: sysInfo?.website || '',
          socialMedia: sysInfo?.socialMedia || {},
        },
      });
      console.log(`${C.green}✔${C.reset} Created VOA AllianceOrganization: ${voaOrg._id}${C.reset}`);
    } else {
      console.log(`${C.yellow}⚠ VOA organization already exists: ${voaOrg._id}${C.reset}`);
    }

    // ── Step 2: Assign all unassigned users to VOA ──────────────────────────
    const unassignedUsers = await User.countDocuments({ allianceOrganizationId: null });
    if (unassignedUsers > 0) {
      const result = await User.updateMany(
        { allianceOrganizationId: null },
        { $set: { allianceOrganizationId: voaOrg._id } }
      );
      console.log(`${C.green}✔${C.reset} Assigned ${result.modifiedCount} user(s) to VOA organization`);
    } else {
      console.log(`${C.yellow}⚠ No unassigned users found${C.reset}`);
    }

    // ── Step 3: Count results ────────────────────────────────────────────────
    const totalUsers = await User.countDocuments();
    const voaUsers = await User.countDocuments({ allianceOrganizationId: voaOrg._id });
    const otherOrgUsers = await User.countDocuments({ allianceOrganizationId: { $ne: voaOrg._id, $ne: null } });
    const totalOrgs = await AllianceOrganization.countDocuments();

    console.log(`\n${C.cyan}${C.bold}Migration Summary:${C.reset}`);
    console.log(`  ${C.gray}├─${C.reset} Total organizations: ${C.bold}${totalOrgs}${C.reset}`);
    console.log(`  ${C.gray}├─${C.reset} Total users:         ${C.bold}${totalUsers}${C.reset}`);
    console.log(`  ${C.gray}├─${C.reset} VOA users:            ${C.bold}${voaUsers}${C.reset}`);
    console.log(`  ${C.gray}└─${C.reset} Other org users:      ${C.bold}${otherOrgUsers}${C.reset}`);
    console.log(`\n${C.green}${C.bold}✔ Migration complete${C.reset}\n`);

    process.exit(0);
  } catch (err) {
    console.error(`\n${C.red}✖ Migration failed: ${err.message}${C.reset}`);
    process.exit(1);
  }
};

migrate();
