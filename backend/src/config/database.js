import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let sequelize;

if (process.env.NODE_ENV === 'test') {
  // Use in-memory SQLite for testing to ensure test independence
  sequelize = new Sequelize('sqlite::memory:', {
    logging: false, // disable logging for cleaner test output
  });
} else {
  // Use PostgreSQL database
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    sequelize = new Sequelize(connectionString, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Required for Supabase SSL connection
        }
      }
    });
  } else {
    // Fallback to local postgres config parameters if no connection string
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const database = process.env.DB_NAME || 'ecoai';
    const username = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';

    sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    });
  }
}

export default sequelize;
export { sequelize };
