const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://engida:1921@localhost:5433/engida',
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT * FROM users WHERE id = 'a8280ff3-c928-4768-b122-5ff4921e9b45';");
  console.log('USER a8280ff3...:');
  console.log(res.rows);

  const res2 = await client.query("SELECT * FROM users WHERE email = 'habtamushewamene@gmail.com';");
  console.log('USER habtamushewamene@gmail.com:');
  console.log(res2.rows);

  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
