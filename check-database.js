const db = require('./db');

async function checkDatabase() {
  try {
    console.log('🔍 Checking Database...\n');
    
    // Check visitors table
    const [visitors] = await db.promise().execute('SELECT * FROM cookie_visitors ORDER BY created_at DESC LIMIT 5');
    console.log('Recent visitors:', visitors);
    
    // Check consents table
    const [consents] = await db.promise().execute('SELECT * FROM cookie_consents ORDER BY created_at DESC LIMIT 5');
    console.log('Recent consents:', consents);
    
    // Check cookie records table
    const [records] = await db.promise().execute('SELECT * FROM cookie_records ORDER BY created_at DESC LIMIT 5');
    console.log('Recent cookie records:', records);
    
    // Check consent logs table
    const [logs] = await db.promise().execute('SELECT * FROM cookie_consent_logs ORDER BY created_at DESC LIMIT 5');
    console.log('Recent consent logs:', logs);
    
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();
