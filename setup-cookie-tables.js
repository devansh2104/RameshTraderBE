const fs = require('fs');
const path = require('path');
const db = require('./db');

async function setupCookieTables() {
  try {
    console.log('🔧 Setting up cookie tables...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'cookies_tables.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon to get individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.promise().execute(statement);
          console.log('✅ Executed SQL statement');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('ℹ️ Table already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('🎉 Cookie tables setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupCookieTables();
