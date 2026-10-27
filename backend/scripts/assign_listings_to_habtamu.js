const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://engida:1921@localhost:5433/engida',
});

async function main() {
  await client.connect();
  // Assign 5 published rental listings to habtamushewamene@gmail.com so they show up in their host calendar!
  const res = await client.query(`
    UPDATE properties 
    SET host_id = 'd29bd1d5-7cdf-4c8e-b82e-9fb491ceeaa5'
    WHERE id IN (
      '4b7c0984-9754-4e24-a554-c573ebaf9342',
      '65645631-a442-405a-bb92-400e8c7cea7d',
      '5eebd2cd-0f04-49e1-9e5f-0894add2a727',
      '03bb8bb8-8057-4771-9efa-8e4086abdf4b'
    );
  `);
  console.log(`Updated ${res.rowCount} properties to belong to habtamushewamene@gmail.com!`);
  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
