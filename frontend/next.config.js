const fs = require('fs');
const path = require('path');

// Dynamically load environment variables from the parent directory's .env file
let env = {};
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      // Ignore empty lines and comments
      if (!line || line.startsWith('#')) return;
      
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key) {
          env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('Failed to read parent .env file:', error);
  }
}

module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};
