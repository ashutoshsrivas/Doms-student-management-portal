#!/usr/bin/env node
// One-off onboarding script for the initial faculty roster (GESoM, May 2026).
// Idempotent — runs `findOrCreate` keyed on email. Existing users are left
// untouched and logged as "skipped".
//
// Usage on the EC2:
//   cd /opt/doms/app/backend
//   node scripts/onboard-faculty.js
//
// All faculty are created with:
//   - status:        ACTIVE
//   - requestedRole: FACULTY
//   - approvedRole:  FACULTY
//   - department:    "Graphic Era School of Management"
//   - password:      "12345678"  (bcrypt-hashed by the model's beforeCreate hook)
//   - metadata.designation: original title (Professor / Associate Professor / etc.)
//
// Faculty members are expected to change the password on first login.

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { User } = require('../src/models');

// ----------------------------------------------------------------------------
// Source data
// ----------------------------------------------------------------------------
const FACULTY = [
  { regNo: '3203115295', empId: '3203115295', name: 'Dr. Ajay Pandey',            designation: 'Professor',          mobile: '9911814222',  email: 'ajaykumarpandey.mgt@geu.ac.in' },
  { regNo: '3224110937', empId: '3224110937', name: 'Dr. Deepak Kaushal',         designation: 'Professor',          mobile: '9870782731',  email: 'dipak.kaushal@geu.ac.in' },
  { regNo: '3202103151', empId: '3202103151', name: 'Dr. Nagendra Sharma',        designation: 'Professor',          mobile: '9839097291',  email: 'Nagendrasharma.mba@geu.ac.in' },
  { regNo: '3202112664', empId: '3202112664', name: 'Mr. Abhishek Singh Chauhan', designation: 'Assistant Professor',mobile: '9335204593',  email: 'abhishek.singhchauhan@geu.ac.in' },
  { regNo: '3202212891', empId: '3202212891', name: 'Ms. Chahat Sahani',          designation: 'Assistant Professor',mobile: '8630117073',  email: 'chahatsahani@geu.ac.in' },
  { regNo: '3202115202', empId: '3202115202', name: 'Dr. Raman Kumar Singh',      designation: 'Assistant Professor',mobile: '9891252352',  email: 'ramankumarsingh.mgt@geu.ac.in' },
  { regNo: '3203115290', empId: '3203115290', name: 'Dr. Sanjay Kumar',           designation: 'Professor',          mobile: '9811311382',  email: 'sanjaykumar.mgt@geu.ac.in' },
  { regNo: '3202114286', empId: '3202114286', name: 'Mr. Vikash Kumar',           designation: 'Assistant Professor',mobile: '7004602860',  email: 'vikashkumar.mgt@geu.ac.in' },
  { regNo: '2602111235', empId: '2602111235', name: 'Dr. Bijesh Dhyani',          designation: 'Associate Professor',mobile: '9634431636',  email: 'bijeshdhyani.mgt@geu.ac.in' },
  { regNo: '3202110886', empId: '3202110886', name: 'Dr. Yogesh Bhatt',           designation: 'Associate Professor',mobile: '7696060507',  email: 'yogeshbhatt.mgt@geu.ac.in' },
  { regNo: '3202113882', empId: '3202113882', name: 'Mr. Shashank Semwal',       designation: 'Assistant Professor',mobile: '6361059552',  email: 'shashanksemwal.mgt@geu.ac.in' },
  { regNo: '3202115050', empId: '3202115050', name: 'Mr. Abhijit Thapa',          designation: 'Assistant Professor',mobile: '9748470010',  email: 'abhijitthapa.mgt@geu.ac.in' },
  { regNo: '3202216044', empId: '3202216044', name: 'Ms. Anshika Joshi',          designation: 'Assistant Professor',mobile: '9927091105',  email: 'anshikajoshi.mgt@geu.ac.in' },
  { regNo: '3203210953', empId: '3203210953', name: 'Dr. Ashulekha Gupta',        designation: 'Professor',          mobile: '9410189638',  email: 'ashulekhagupta.mgt@geu.ac.in' },
  { regNo: '3224110734', empId: '3224110734', name: 'Dr. M P Singh',              designation: 'Professor',          mobile: '9412679862',  email: 'mpsingh@geu.ac.in' },
  { regNo: '3224110068', empId: '3224110068', name: 'Dr. Arvind Mohan',           designation: 'Professor',          mobile: '9837109885',  email: 'arvindmohan.mba@geu.ac.in' },
  { regNo: '3203110975', empId: '3203110975', name: 'Dr. Rajesh Tiwari',          designation: 'Professor',          mobile: '9996016775',  email: 'rajeshtiwari.mgt@geu.ac.in' },
  { regNo: '1124110643', empId: '1124110643', name: 'Dr. D C Pandey',             designation: 'Professor',          mobile: '9760202914',  email: 'dineshchandra@geu.ac.in' },
  { regNo: '3203113946', empId: '3203113946', name: 'Dr. Pawan Kumar',            designation: 'Research Professor', mobile: '9466322425',  email: 'pawankumar.mgt@geu.ac.in' },
  { regNo: '3224110208', empId: '3224110208', name: 'Dr. Praveen Singh',          designation: 'Professor',          mobile: '9358112799',  email: 'praveensingh@geu.ac.in' },
  { regNo: '3293112480', empId: '3293112480', name: 'Dr. Sanjay Taneja',          designation: 'Research Professor', mobile: '9255484786',  email: 'sanjaytaneja.mgt@geu.ac.in' },
  { regNo: '32114144',   empId: '32114144',   name: 'Dr. Rakesh Kumar',           designation: 'Research Professor', mobile: '9359168332',  email: 'rakeshkumar.mgt@geu.ac.in' },
  { regNo: '32TA110677', empId: '32TA110677', name: 'Mr. Vivek Verma',            designation: 'Assistant Professor',mobile: '7600021298',  email: 'vivekverma.mgt@geu.ac.in' },
  { regNo: '3203113904', empId: '3203113904', name: 'Dr. Ratnakar Mishra',        designation: 'Professor',          mobile: '9437199973',  email: 'ratnakarmishra.mgt@geu.ac.in' },
  { regNo: 'F393210575', empId: 'F393210575', name: 'Dr. Khyati Kapil',           designation: 'Associate Professor',mobile: '9759254380',  email: 'Khyatikapil.mgt@geu.ac.in' },
  { regNo: '3202215959', empId: '3202215959', name: 'Dr. Shaivya Dixit',          designation: 'Assistant Professor',mobile: '9627469537',  email: 'shaivyadixit.mgt@geu.ac.in' },
  { regNo: '3293113150', empId: '3293113150', name: 'Dr. Neeraj Sharma',          designation: 'Professor',          mobile: '9557185349',  email: 'neerajsharma.mba@geu.ac.in' },
  { regNo: '3224210936', empId: '3224210936', name: 'Dr. Manu Sharma',            designation: 'Professor',          mobile: '9557274967',  email: 'manu.sharma@geu.ac.in' },
  { regNo: '3293112636', empId: '3293112636', name: 'Dr. Shwetank Avikal',        designation: 'Research Professor', mobile: '9457218825',  email: 'shwetankavikal.mgt@geu.ac.in' },
  { regNo: '32112157',   empId: '32112157',   name: 'Mr. Mohit Gundwal',          designation: 'Assistant Professor',mobile: '7310953857',  email: 'mohitgundwal.mgt@geu.ac.in' },
  { regNo: '3293214888', empId: '3293214888', name: 'Dr. Kirti Udayai',           designation: 'Associate Professor',mobile: '9971389941',  email: 'kirtiudayai.mgt@geu.ac.in' },
  { regNo: '3202115337', empId: '3202115337', name: 'Mr. Prabhu Saran Mathur',    designation: 'Assistant Professor',mobile: '9792222993',  email: 'prabhusaranmathur.mgt@geu.ac.in' },
];

const DEFAULT_PASSWORD = '12345678';
const DEPARTMENT = 'Graphic Era School of Management';

/** Split "Dr. Foo Bar Baz" → { firstName: 'Foo', lastName: 'Bar Baz' } */
function splitName(fullName) {
  const stripped = fullName.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s+/i, '').trim();
  const parts = stripped.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function main() {
  console.log('→ Connecting to DB…');
  await sequelize.authenticate();
  console.log('  Connected.');

  // Stats
  const created = [];
  const skipped = [];
  const errored = [];

  for (const entry of FACULTY) {
    const emailKey = entry.email.trim().toLowerCase();
    try {
      // Pre-check by email OR registrationNumber OR employeeId so we don't
      // hit a unique-constraint error and abort.
      const { Op } = require('sequelize');
      const existing = await User.findOne({
        where: {
          [Op.or]: [
            { email: emailKey },
            { registrationNumber: entry.regNo },
            { employeeId: entry.empId },
          ],
        },
      });
      if (existing) {
        skipped.push({ email: emailKey, reason: `already exists (id=${existing.id}, status=${existing.status})` });
        continue;
      }

      const { firstName, lastName } = splitName(entry.name);
      const user = await User.create({
        email: emailKey,
        password: DEFAULT_PASSWORD,        // model hashes via beforeCreate hook
        firstName,
        lastName,
        phoneNumber: entry.mobile,
        department: DEPARTMENT,
        employeeId: entry.empId,
        registrationNumber: entry.regNo,
        requestedRole: 'FACULTY',
        approvedRole: 'FACULTY',
        status: 'ACTIVE',
        isVerified: true,
        metadata: {
          designation: entry.designation,
          onboardedVia: 'bulk-script-2026-05',
          originalDisplayName: entry.name,
        },
      });
      created.push({ email: emailKey, id: user.id });
    } catch (err) {
      errored.push({ email: emailKey, error: err.message });
    }
  }

  // --- Report ---
  console.log('');
  console.log('==========================================');
  console.log(`  Created : ${created.length}`);
  console.log(`  Skipped : ${skipped.length}`);
  console.log(`  Errored : ${errored.length}`);
  console.log('==========================================');

  if (created.length) {
    console.log('\nCreated:');
    for (const c of created) console.log(`  ✓ ${c.email}   (id=${c.id})`);
  }
  if (skipped.length) {
    console.log('\nSkipped (already in DB):');
    for (const s of skipped) console.log(`  ↷ ${s.email}   — ${s.reason}`);
  }
  if (errored.length) {
    console.log('\nErrored:');
    for (const e of errored) console.log(`  ✗ ${e.email}   — ${e.error}`);
  }
  console.log('');
  if (created.length) {
    console.log(`Default password for all newly-created accounts: "${DEFAULT_PASSWORD}"`);
    console.log('Faculty should change it on first login.');
  }

  await sequelize.close();
  process.exit(errored.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
