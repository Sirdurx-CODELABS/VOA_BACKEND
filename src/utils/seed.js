require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * VOA System — Full Role Seed
 *
 * Organizational flow (top → bottom):
 *
 *  super_admin          → Full system control
 *  chairman             → Overall organizational authority
 *  vice_chairman        → Delegates for chairman
 *  secretary            → Records, attendance, reports
 *  treasurer            → Finance & transactions
 *  pro                  → Public relations & announcements
 *  program_coordinator  → Creates & manages programs ← PROGRAM FLOW STARTS HERE
 *  membership_coordinator → Approves & manages members
 *  welfare_officer      → Handles welfare requests
 *  member               → Participates in programs ← PROGRAM FLOW ENDS HERE
 */

const SEED_USERS = [
  // ── SYSTEM ──────────────────────────────────────────────────────────────
  {
    fullName: 'Super Admin',
    email: 'superadmin@voa.org',
    password: 'SuperAdmin@123',
    phone: '08000000001',
    role: 'super_admin',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 0,
    bio: 'Full system administrator with unrestricted access.',
  },

  // ── LEADERSHIP ──────────────────────────────────────────────────────────
  {
    fullName: 'Aminu Bello',
    email: 'chairman@voa.org',
    password: 'Chairman@123',
    phone: '08011111111',
    role: 'chairman',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 95,
    bio: 'Chairman of VOA. Oversees all operations and strategic direction.',
  },
  {
    fullName: 'Fatima Usman',
    email: 'vicechairman@voa.org',
    password: 'ViceChair@123',
    phone: '08022222222',
    role: 'vice_chairman',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 88,
    bio: 'Vice Chairman. Supports the chairman and leads in their absence.',
  },

  // ── OPERATIONS ──────────────────────────────────────────────────────────
  {
    fullName: 'Ibrahim Musa',
    email: 'secretary@voa.org',
    password: 'Secretary@123',
    phone: '08033333333',
    role: 'secretary',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 72,
    bio: 'Secretary. Records meeting minutes, manages attendance and reports.',
  },
  {
    fullName: 'Aisha Garba',
    email: 'treasurer@voa.org',
    password: 'Treasurer@123',
    phone: '08044444444',
    role: 'treasurer',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 68,
    bio: 'Treasurer. Manages all financial transactions and budget reports.',
  },
  {
    fullName: 'Chukwuemeka Obi',
    email: 'pro@voa.org',
    password: 'ProOfficer@123',
    phone: '08055555555',
    role: 'pro',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 60,
    bio: 'Public Relations Officer. Manages announcements and public communications.',
  },

  // ── PROGRAM FLOW ────────────────────────────────────────────────────────
  // Step 1: Program Coordinator creates the program
  {
    fullName: 'Ngozi Adeyemi',
    email: 'coordinator@voa.org',
    password: 'Coordinator@123',
    phone: '08066666666',
    role: 'program_coordinator',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 55,
    bio: 'Program Coordinator. Creates programs, assigns members, tracks participation.',
  },
  // Step 2: Membership Coordinator approves members to join
  {
    fullName: 'Yusuf Abdullahi',
    email: 'membership@voa.org',
    password: 'Membership@123',
    phone: '08077777777',
    role: 'membership_coordinator',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 50,
    bio: 'Membership Coordinator. Approves registrations and manages member engagement.',
  },
  // Step 3: Welfare Officer supports members during programs
  {
    fullName: 'Blessing Eze',
    email: 'welfare@voa.org',
    password: 'Welfare@123',
    phone: '08088888888',
    role: 'welfare_officer',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 45,
    bio: 'Welfare Officer. Handles member welfare requests and inactive member alerts.',
  },
  // Step 4: Members participate in programs
  {
    fullName: 'Halima Suleiman',
    email: 'member1@voa.org',
    password: 'Member@123',
    phone: '08099999901',
    role: 'member',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 30,
    bio: 'Active member. Participates in programs and community activities.',
  },
  {
    fullName: 'Emeka Nwosu',
    email: 'member2@voa.org',
    password: 'Member@123',
    phone: '08099999902',
    role: 'member',
    status: 'active',
    isEmailVerified: true,
    engagementScore: 25,
    bio: 'Active member. Youth advocate and program participant.',
  },
  {
    fullName: 'Zainab Lawal',
    email: 'member3@voa.org',
    password: 'Member@123',
    phone: '08099999903',
    role: 'member',
    status: 'inactive',  // pending approval — to demo membership coordinator flow
    isEmailVerified: true,
    engagementScore: 0,
    bio: 'New member awaiting approval by Membership Coordinator.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  blue: '\x1b[34m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', cyan: '\x1b[36m', gray: '\x1b[90m', orange: '\x1b[33m',
};

const roleColor = (role) => {
  const map = {
    super_admin: C.red, chairman: C.blue, vice_chairman: C.blue,
    secretary: C.cyan, treasurer: C.cyan, pro: C.cyan,
    program_coordinator: C.green, membership_coordinator: C.green,
    welfare_officer: C.yellow, member: C.gray,
  };
  return map[role] || C.reset;
};

// ── Main ─────────────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`\n${C.green}✔ Connected to MongoDB${C.reset}\n`);

    // Delete ALL existing users
    const deleted = await User.deleteMany({});
    console.log(`${C.yellow}⚠  Deleted ${deleted.deletedCount} existing user(s)${C.reset}\n`);

    console.log(`${C.bold}${C.blue}VOA Organizational Flow — Seeding Users${C.reset}`);
    console.log(`${C.gray}${'─'.repeat(60)}${C.reset}\n`);

    const created = [];

    for (const userData of SEED_USERS) {
      const { bio, ...data } = userData;
      const user = await User.create(data);
      created.push(user);

      const rc = roleColor(user.role);
      console.log(`${C.green}✔${C.reset} ${C.bold}${user.fullName}${C.reset}`);
      console.log(`  ${C.gray}Email   :${C.reset} ${user.email}`);
      console.log(`  ${C.gray}Password:${C.reset} ${userData.password}`);
      console.log(`  ${C.gray}Role    :${C.reset} ${rc}${C.bold}${user.role.replace(/_/g, ' ').toUpperCase()}${C.reset}`);
      console.log(`  ${C.gray}Status  :${C.reset} ${user.status === 'active' ? C.green : C.yellow}${user.status}${C.reset}`);
      console.log(`  ${C.gray}Note    :${C.reset} ${C.gray}${bio}${C.reset}`);
      console.log();
    }

    // Set reportsTo relationships
    const find = (email) => created.find(u => u.email === email);
    const chairman = find('chairman@voa.org');
    const viceChairman = find('vicechairman@voa.org');

    const reportingMap = [
      { email: 'vicechairman@voa.org',  reportsTo: chairman?._id },
      { email: 'secretary@voa.org',     reportsTo: chairman?._id },
      { email: 'treasurer@voa.org',     reportsTo: chairman?._id },
      { email: 'pro@voa.org',           reportsTo: viceChairman?._id },
      { email: 'coordinator@voa.org',   reportsTo: viceChairman?._id },
      { email: 'membership@voa.org',    reportsTo: viceChairman?._id },
      { email: 'welfare@voa.org',       reportsTo: viceChairman?._id },
      { email: 'member1@voa.org',       reportsTo: find('coordinator@voa.org')?._id },
      { email: 'member2@voa.org',       reportsTo: find('coordinator@voa.org')?._id },
      { email: 'member3@voa.org',       reportsTo: find('membership@voa.org')?._id },
    ];

    for (const { email, reportsTo } of reportingMap) {
      if (reportsTo) await User.updateOne({ email }, { reportsTo });
    }

    console.log(`${C.gray}${'─'.repeat(60)}${C.reset}`);
    console.log(`\n${C.green}${C.bold}✔ Seed complete — ${created.length} users created${C.reset}\n`);

    console.log(`${C.bold}${C.blue}Program Flow Summary:${C.reset}`);
    console.log(`  ${C.green}1.${C.reset} ${C.bold}Program Coordinator${C.reset} creates a program`);
    console.log(`  ${C.green}2.${C.reset} ${C.bold}Membership Coordinator${C.reset} approves members`);
    console.log(`  ${C.green}3.${C.reset} ${C.bold}Program Coordinator${C.reset} assigns approved members`);
    console.log(`  ${C.green}4.${C.reset} ${C.bold}Secretary${C.reset} records attendance`);
    console.log(`  ${C.green}5.${C.reset} ${C.bold}Treasurer${C.reset} logs program expenses`);
    console.log(`  ${C.green}6.${C.reset} ${C.bold}Chairman${C.reset} approves major expenses`);
    console.log(`  ${C.green}7.${C.reset} ${C.bold}Secretary${C.reset} uploads meeting report`);
    console.log(`  ${C.green}8.${C.reset} ${C.bold}PRO${C.reset} publishes announcement`);
    console.log(`  ${C.green}9.${C.reset} ${C.bold}Welfare Officer${C.reset} follows up on inactive members`);
    console.log(`  ${C.green}10.${C.reset} ${C.bold}Members${C.reset} participate and earn engagement points\n`);

    process.exit(0);
  } catch (err) {
    console.error(`\n${C.red}✖ Seed failed: ${err.message}${C.reset}`);
    process.exit(1);
  }
};

seed();
