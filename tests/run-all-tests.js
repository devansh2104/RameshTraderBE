const { spawn } = require('child_process');

const scripts = [
  'tests/test-variants-and-linking.js'
];

(async () => {
  for (const script of scripts) {
    console.log(`\nRunning: ${script}`);
    await new Promise((resolve, reject) => {
      const p = spawn('node', [script], { stdio: 'inherit', shell: false });
      p.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`${script} failed with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }
  console.log('\nAll test scripts completed.');
})(); 