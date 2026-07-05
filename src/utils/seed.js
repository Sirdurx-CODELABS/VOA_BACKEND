require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const AllianceOrganization = require('../models/AllianceOrganization');

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

const VOA_USERS = [
  { fullName: 'Super Admin', email: 'superadmin@voa.org', password: 'SuperAdmin@123', phone: '08000000001', role: 'super_admin', status: 'active', bio: 'Full system administrator with unrestricted access.' },
  { fullName: 'Aminu Bello', email: 'chairman@voa.org', password: 'Chairman@123', phone: '08011111111', role: 'chairman', status: 'active', engagementScore: 95, bio: 'Chairman of VOA.' },
  { fullName: 'Fatima Usman', email: 'vicechairman@voa.org', password: 'ViceChair@123', phone: '08022222222', role: 'vice_chairman', status: 'active', engagementScore: 88, bio: 'Vice Chairman.' },
  { fullName: 'Ibrahim Musa', email: 'secretary@voa.org', password: 'Secretary@123', phone: '08033333333', role: 'secretary', status: 'active', engagementScore: 72, bio: 'Secretary.' },
  { fullName: 'Aisha Garba', email: 'treasurer@voa.org', password: 'Treasurer@123', phone: '08044444444', role: 'treasurer', status: 'active', engagementScore: 68, bio: 'Treasurer.' },
  { fullName: 'Chukwuemeka Obi', email: 'pro@voa.org', password: 'ProOfficer@123', phone: '08055555555', role: 'pro', status: 'active', engagementScore: 60, bio: 'PRO.' },
  { fullName: 'Ngozi Adeyemi', email: 'coordinator@voa.org', password: 'Coordinator@123', phone: '08066666666', role: 'program_coordinator', status: 'active', engagementScore: 55, bio: 'Program Coordinator.' },
  { fullName: 'Yusuf Abdullahi', email: 'membership@voa.org', password: 'Membership@123', phone: '08077777777', role: 'membership_coordinator', status: 'active', engagementScore: 50, bio: 'Membership Coordinator.' },
  { fullName: 'Blessing Eze', email: 'welfare@voa.org', password: 'Welfare@123', phone: '08088888888', role: 'welfare_officer', status: 'active', engagementScore: 45, bio: 'Welfare Officer.' },
  { fullName: 'Halima Suleiman', email: 'member1@voa.org', password: 'Member@123', phone: '08099999901', role: 'member', status: 'active', engagementScore: 30, bio: 'Active member.' },
  { fullName: 'Emeka Nwosu', email: 'member2@voa.org', password: 'Member@123', phone: '08099999902', role: 'member', status: 'active', engagementScore: 25, bio: 'Active member.' },
  { fullName: 'Zainab Lawal', email: 'member3@voa.org', password: 'Member@123', phone: '08099999903', role: 'member', status: 'pending', engagementScore: 0, bio: 'New member awaiting approval.' },
];

const MMSH_USERS = [
  { fullName: 'Prof. Idris Sani', email: 'chairman@mmsh.org', password: 'MMSHChair@123', phone: '08110000001', role: 'chairman', status: 'active', engagementScore: 92, bio: 'Chairman of MMSH Support Group.' },
  { fullName: 'Dr. Zainab Abubakar', email: 'vicechairman@mmsh.org', password: 'MMSHVice@123', phone: '08110000002', role: 'vice_chairman', status: 'active', engagementScore: 85, bio: 'Vice Chairman.' },
  { fullName: 'Amina Lawal', email: 'secretary@mmsh.org', password: 'MMSHSecy@123', phone: '08110000003', role: 'secretary', status: 'active', engagementScore: 70, bio: 'Secretary.' },
  { fullName: 'Musa Abdullahi', email: 'treasurer@mmsh.org', password: 'MMSHTreas@123', phone: '08110000004', role: 'treasurer', status: 'active', engagementScore: 65, bio: 'Treasurer.' },
  { fullName: 'Rukayya Suleiman', email: 'pro@mmsh.org', password: 'MMSHPro@123', phone: '08110000005', role: 'pro', status: 'active', engagementScore: 58, bio: 'PRO.' },
  { fullName: 'Dr. Aisha Mahmud', email: 'coordinator@mmsh.org', password: 'MMSHCoord@123', phone: '08110000006', role: 'program_coordinator', status: 'active', engagementScore: 75, bio: 'Program Coordinator.' },
  { fullName: 'Hassan Ibrahim', email: 'membership@mmsh.org', password: 'MMSHMember@123', phone: '08110000007', role: 'membership_coordinator', status: 'active', engagementScore: 60, bio: 'Membership Coordinator.' },
  { fullName: 'Mariam Bello', email: 'welfare@mmsh.org', password: 'MMSHWelfare@123', phone: '08110000008', role: 'welfare_officer', status: 'active', engagementScore: 68, bio: 'Welfare Officer.' },
  { fullName: 'Sadiya Yusuf', email: 'member1@mmsh.org', password: 'MMSHMember@123', phone: '08110000009', role: 'member', status: 'active', engagementScore: 25, bio: 'Support group participant.' },
  { fullName: 'Kabir Umar', email: 'member2@mmsh.org', password: 'MMSHMember@123', phone: '08110000010', role: 'member', status: 'active', engagementScore: 20, bio: 'Support group participant.' },
  { fullName: 'Hauwa Adamu', email: 'member3@mmsh.org', password: 'MMSHMember@123', phone: '08110000011', role: 'member', status: 'pending', engagementScore: 0, bio: 'New referral awaiting approval.' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`\n${C.green}✔ Connected to MongoDB${C.reset}\n`);

    // ── Clear ALL collections ─────────────────────────────────────────
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.dropCollection(col.name);
    }
    console.log(`${C.yellow}⚠  All collections dropped${C.reset}\n`);

    // ── Create 5 Organizations ─────────────────────────────────────────
    const orgs = [
      {
        organizationName: 'Voice of Adolescents',
        shortName: 'VOA',
        status: 'active',
        organizationType: 'ngo',
        facilityType: 'headquarters',
        district: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        address: 'SS.Wali Aminu Kano Teaching Hospitals, Kano State, Nigeria',
        contactEmail: 'voiceofadolescence1@gmail.com',
        contactPhone: '+234 8143705588',
        website: 'www.voiceofadolescent.org',
        primaryColor: '#1E3A8A',
        secondaryColor: '#F97316',
        accentColor: '#22C55E',
        description: 'Voice of Adolescents - empowering voices, building futures.',
      },
      {
        organizationName: 'Murtala Muhammad Specialist Hospital Support Group',
        shortName: 'MMSH',
        status: 'active',
        organizationType: 'support_group',
        facilityType: 'hospital',
        district: 'Kano Municipal',
        state: 'Kano State',
        country: 'Nigeria',
        address: 'Murtala Muhammad Specialist Hospital, Kano, Nigeria',
        contactEmail: 'support@mmsh.org',
        contactPhone: '+234 8000000000',
        primaryColor: '#0D7C3F',
        secondaryColor: '#F5A623',
        accentColor: '#2E86DE',
        description: 'Support group for adolescents at Murtala Muhammad Specialist Hospital.',
      },
      {
        organizationName: 'Al-Noury Foundation',
        shortName: 'Alnoury',
        status: 'pending',
        organizationType: 'ngo',
        facilityType: 'community_center',
        district: 'Kano Central',
        state: 'Kano State',
        country: 'Nigeria',
        address: 'Al-Noury House, Kano Central, Nigeria',
        contactEmail: 'info@alnoury.org',
        contactPhone: '+234 8123456789',
        primaryColor: '#8B4513',
        secondaryColor: '#DAA520',
        accentColor: '#2F4F4F',
        description: 'Al-Noury Foundation - community development and youth empowerment.',
      },
      {
        organizationName: 'Sahara Youth Initiative',
        shortName: 'Sahara',
        status: 'pending',
        organizationType: 'ngo',
        facilityType: 'community_center',
        district: 'Kano North',
        state: 'Kano State',
        country: 'Nigeria',
        address: 'Sahara House, Kano North, Nigeria',
        contactEmail: 'info@saharayouth.org',
        contactPhone: '+234 8098765432',
        primaryColor: '#C0392B',
        secondaryColor: '#F39C12',
        accentColor: '#27AE60',
        description: 'Sahara Youth Initiative - engaging youth for positive change.',
      },
      {
        organizationName: 'Hope Foundation for Adolescents',
        shortName: 'Hope',
        status: 'pending',
        organizationType: 'ngo',
        facilityType: 'clinic',
        district: 'Kano South',
        state: 'Kano State',
        country: 'Nigeria',
        address: 'Hope House, Kano South, Nigeria',
        contactEmail: 'info@hopefoundation.org',
        contactPhone: '+234 8055555555',
        primaryColor: '#E91E63',
        secondaryColor: '#00BCD4',
        accentColor: '#FFEB3B',
        description: 'Hope Foundation - supporting adolescents with health and education.',
      },
    ];

    const createdOrgs = [];
    for (const orgData of orgs) {
      const org = await AllianceOrganization.create(orgData);
      createdOrgs.push(org);
      const statusColor = org.status === 'active' ? C.green : C.yellow;
      console.log(`${C.green}✔${C.reset} ${C.bold}${org.shortName}${C.reset} — ${org.organizationName} (${statusColor}${org.status}${C.reset})`);
    }
    console.log();

    const [voaOrg, mmshOrg, alnouryOrg, saharaOrg, hopeOrg] = createdOrgs;

    // ── Helper to create users for an org ──────────────────────────────
    const createUsers = async (users, orgId) => {
      const created = [];
      for (const u of users) {
        const { bio, ...data } = u;
        const user = await User.create({ ...data, allianceOrganizationId: orgId, isEmailVerified: true });
        created.push(user);

        const rc = roleColor(user.role);
        const statusColor = user.status === 'active' ? C.green : C.yellow;
        console.log(`${C.green}✔${C.reset} ${C.bold}${user.fullName}${C.reset}`);
        console.log(`  ${C.gray}Email   :${C.reset} ${user.email}`);
        console.log(`  ${C.gray}Password:${C.reset} ${u.password}`);
        console.log(`  ${C.gray}Role    :${C.reset} ${rc}${C.bold}${user.role.replace(/_/g, ' ').toUpperCase()}${C.reset}`);
        console.log(`  ${C.gray}Status  :${C.reset} ${statusColor}${user.status}${C.reset}`);
        console.log(`  ${C.gray}Org     :${C.reset} ${orgId}${C.reset}`);
        if (bio) console.log(`  ${C.gray}Note    :${C.reset} ${C.gray}${bio}${C.reset}`);
        console.log();
      }
      return created;
    };

    const setReportsTo = async (users, orgFind) => {
      const chair = orgFind('chairman');
      const vice = orgFind('vice_chairman');
      const coord = orgFind('coordinator');
      const member = orgFind('membership');
      const map = [];
      if (vice && chair) map.push({ email: vice.email, reportsTo: chair._id });
      if (orgFind('secretary') && chair) map.push({ email: orgFind('secretary').email, reportsTo: chair._id });
      if (orgFind('treasurer') && chair) map.push({ email: orgFind('treasurer').email, reportsTo: chair._id });
      if (orgFind('pro') && vice) map.push({ email: orgFind('pro').email, reportsTo: vice._id });
      if (coord && vice) map.push({ email: coord.email, reportsTo: vice._id });
      if (member && vice) map.push({ email: member.email, reportsTo: vice._id });
      if (orgFind('welfare') && vice) map.push({ email: orgFind('welfare').email, reportsTo: vice._id });
      if (orgFind('member1') && coord) map.push({ email: orgFind('member1').email, reportsTo: coord._id });
      if (orgFind('member2') && coord) map.push({ email: orgFind('member2').email, reportsTo: coord._id });
      if (orgFind('member3') && member) map.push({ email: orgFind('member3').email, reportsTo: member._id });
      for (const { email, reportsTo } of map) {
        if (reportsTo) await User.updateOne({ email }, { reportsTo });
      }
    };

    // ── VOA Users ──────────────────────────────────────────────────────
    console.log(`${C.bold}${C.blue}── VOA Users ──────────────────────────────${C.reset}\n`);
    const voaUsers = await createUsers(VOA_USERS, voaOrg._id);
    const voaFind = (r) => voaUsers.find(u => u.role === r && u.email.includes('@voa.org')) || voaUsers.find(u => u.email.includes(r + '@voa.org'));
    await setReportsTo(voaUsers, (emailPrefix) => voaUsers.find(u => u.email.startsWith(emailPrefix + '@')));

    // ── MMSH Users ─────────────────────────────────────────────────────
    console.log(`${C.bold}${C.blue}── MMSH Users ─────────────────────────────${C.reset}\n`);
    const mmshUsers = await createUsers(MMSH_USERS, mmshOrg._id);
    await setReportsTo(mmshUsers, (emailPrefix) => mmshUsers.find(u => u.email.startsWith(emailPrefix + '@')));

    // ── Pending Org Users (chairman only) ──────────────────────────────
    const pendingOrgs = [
      { org: alnouryOrg, users: [{ fullName: 'Hassan Al-Noury', email: 'chairman@alnoury.org', password: 'Alnoury@123', phone: '08210000001', role: 'chairman', status: 'active', bio: 'Chairman of Al-Noury Foundation.' }] },
      { org: saharaOrg, users: [{ fullName: 'Amina Sahara', email: 'chairman@saharayouth.org', password: 'Sahara@123', phone: '08210000002', role: 'chairman', status: 'active', bio: 'Chairman of Sahara Youth Initiative.' }] },
      { org: hopeOrg, users: [{ fullName: 'Grace Hope', email: 'chairman@hopefoundation.org', password: 'Hope@123', phone: '08210000003', role: 'chairman', status: 'active', bio: 'Chairman of Hope Foundation for Adolescents.' }] },
    ];

    for (const { org, users } of pendingOrgs) {
      console.log(`${C.bold}${C.yellow}── ${org.shortName} Users (Pending Org) ──────${C.reset}\n`);
      await createUsers(users, org._id);
    }

    const totalOrgs = createdOrgs.length;
    const totalUsers = voaUsers.length + mmshUsers.length + pendingOrgs.reduce((s, p) => s + p.users.length, 0);
    console.log(`${C.gray}${'─'.repeat(60)}${C.reset}`);
    console.log(`\n${C.green}${C.bold}✔ Seed complete — ${totalOrgs} organizations, ${totalUsers} users${C.reset}\n`);

    console.log(`${C.bold}${C.blue}Organizations:${C.reset}`);
    for (const org of createdOrgs) {
      const sc = org.status === 'active' ? C.green : C.yellow;
      console.log(`  ${sc}${org.shortName}${C.reset} — ${org.organizationName} (${sc}${org.status}${C.reset})`);
    }
    console.log();

    console.log(`${C.bold}${C.blue}Login Credentials:${C.reset}`);
    console.log(`  ${C.gray}Super Admin:${C.reset} superadmin@voa.org / SuperAdmin@123 (access all orgs)`);
    console.log(`  ${C.gray}VOA Chairman:${C.reset} chairman@voa.org / Chairman@123`);
    console.log(`  ${C.gray}VOA Vice Chair:${C.reset} vicechairman@voa.org / ViceChair@123`);
    console.log(`  ${C.gray}MMSH Chairman:${C.reset} chairman@mmsh.org / MMSHChair@123`);
    console.log(`  ${C.gray}Alnoury Chairman:${C.reset} chairman@alnoury.org / Alnoury@123 (org pending)`);
    console.log(`  ${C.gray}Sahara Chairman:${C.reset} chairman@saharayouth.org / Sahara@123 (org pending)`);
    console.log(`  ${C.gray}Hope Chairman:${C.reset} chairman@hopefoundation.org / Hope@123 (org pending)\n`);

    process.exit(0);
  } catch (err) {
    console.error(`\n${C.red}✖ Seed failed: ${err.message}${C.reset}`);
    process.exit(1);
  }
};

seed();
