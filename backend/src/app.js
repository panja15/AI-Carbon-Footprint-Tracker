import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import sequelize from './config/database.js';

const app = express();

app.use(cors());
app.use(express.json());

// Main API routes
app.use('/api', apiRouter);

// Sync database models
export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    // Force sync only in tests, standard sync otherwise (alter: true or safe sync)
    const force = process.env.NODE_ENV === 'test';
    await sequelize.sync({ force, alter: true });
    console.log(`Database synchronized. (force: ${force})`);
  } catch (error) {
    console.error('Database connection / synchronization error:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

export default app;
