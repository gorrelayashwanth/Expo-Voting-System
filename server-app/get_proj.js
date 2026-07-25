const { Client } = require('pg');
const client = new Client({connectionString: 'postgresql://postgres:232006%40Pg@localhost:5432/postgres?schema=public'});
client.connect().then(() => client.query('SELECT id FROM "Projects" LIMIT 1'))
.then(res => { console.log(res.rows[0].id); client.end(); })
.catch(console.error);
