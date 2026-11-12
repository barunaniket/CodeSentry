/**
 * fix-seed-passwords.js
 * Run once: node fix-seed-passwords.js
 * Updates the seeded users with real bcrypt hashes so login works.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://codesentry:codesentry_password@localhost:5432/codesentry_db',
});

const users = [
  { email: 'admin@codesentry.org',  password: 'Admin@1234'  },
  { email: 'alice@contest.edu',     password: 'Alice@1234'  },
  { email: 'bob@student.edu',       password: 'Bob@1234'    },
  { email: 'charlie@student.edu',   password: 'Charlie@1234'},
  { email: 'diana@student.edu',     password: 'Diana@1234'  },
];

async function main() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, role',
      [hash, u.email]
    );
    if (result.rows.length > 0) {
      console.log(`✓ Updated: ${result.rows[0].email} (${result.rows[0].role})  →  password: "${u.password}"`);
    } else {
      console.log(`✗ Not found: ${u.email}`);
    }
  }
  await pool.end();
  console.log('\nDone! You can now log in with the passwords above.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
