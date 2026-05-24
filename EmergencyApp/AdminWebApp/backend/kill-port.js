// kill-port.js - Kill process using port 5000
const { execSync } = require('child_process');
const PORT = process.env.PORT || 5000;

try {
  if (process.platform === 'win32') {
    // Windows
    console.log(`[*] Checking if port ${PORT} is in use...`);
    try {
      const result = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf-8' });
      if (result) {
        const lines = result.trim().split('\n');
        const pidLine = lines[0];
        const parts = pidLine.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          console.log(`[*] Found process ${pid} on port ${PORT}, killing...`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
          console.log(`[✓] Port ${PORT} cleared`);
        } else {
          console.log(`[✓] Port ${PORT} is free`);
        }
      }
    } catch (e) {
      console.log(`[✓] Port ${PORT} is free`);
    }
  } else {
    // Mac/Linux
    try {
      execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`, { stdio: 'inherit' });
      console.log(`[✓] Port ${PORT} cleared`);
    } catch (e) {
      console.log(`[✓] Port ${PORT} is free`);
    }
  }
} catch (err) {
  console.error(`[!] Error cleaning port: ${err.message}`);
  process.exit(1);
}
