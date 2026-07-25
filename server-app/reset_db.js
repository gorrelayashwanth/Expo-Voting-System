const { Client } = require('pg');
const client = new Client({connectionString: 'postgresql://postgres:232006%40Pg@localhost:5432/postgres?schema=public'});
client.connect()
.then(() => client.query('DELETE FROM "Votes"'))
.then(() => client.query('UPDATE "Voters" SET has_voted = false'))
.then(() => { console.log('DB reset'); client.end(); })
.catch(console.error);
