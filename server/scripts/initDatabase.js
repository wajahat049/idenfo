require('dotenv').config();
const { initDatabase, closeDatabase } = require('../db/database');

initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
    closeDatabase();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    closeDatabase();
    process.exit(1);
  });

