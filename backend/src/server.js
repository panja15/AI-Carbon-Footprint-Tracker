import app, { initDatabase } from './app.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 5000;

// Initialize Database before starting the server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`EcoAI Backend server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize application database:', err);
});
