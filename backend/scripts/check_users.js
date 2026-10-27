const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://engida:1921@localhost:5433/engida',
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, name, email, role, admin_role FROM users LIMIT 10;');
  console.log('USERS IN DB:');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
