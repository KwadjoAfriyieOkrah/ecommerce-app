// WHY USE dotenv?
// - dotenv loads variables from the .env file into process.env at runtime.
// - This keeps secrets and environment-specific settings out of the source code.
// - Without dotenv, Node.js would not know about DB credentials, JWT secret, or port values.
// - Trade-off: one extra package and a small startup step, but this is the standard and safe pattern.
require('dotenv').config();

// WHY VALIDATE CONFIG EARLY?
// - If a required secret or database value is missing, the app should fail immediately.
// - This prevents confusing runtime errors later in the app when a database connection or JWT signing fails.
// - It is safer to stop the server at startup than to let the app run in a broken state.
// - Example: if JWT_SECRET is missing, every login request would fail unpredictably.
const requiredEnvVars = [
  'DATABASE_URL',  // ← CHANGED: Now using single connection string instead of DB_HOST, DB_PORT, etc.
  'JWT_SECRET',
  'JWT_EXPIRY',
  'REFRESH_TOKEN_EXPIRY',
  'PORT',
  'NODE_ENV',
];

const missingEnvVars = requiredEnvVars.filter((key) => {
  const value = process.env[key];
  return value === undefined || value === null || value === '';
});

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}. Add them to the .env file before starting the server.`
  );
}

// WHY EXPORT AS AN OBJECT?
// - This creates a single source of truth for configuration.
// - Other files can use config.db.url, config.jwt.secret, config.server.port instead of repeating process.env everywhere.
// - This is easier to maintain, easier to test, and avoids scattered environment lookups.
// - Alternative: access process.env directly in many files. That is harder to validate and harder to refactor.
const parsePort = (value, label) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 65535) {
    throw new Error(`${label} must be a valid port number between 1 and 65535.`);
  }

  return parsedValue;
};

const config = {
  db: {
    url: process.env.DATABASE_URL,  // ← CHANGED: Single connection string for Neon
    ssl: { rejectUnauthorized: false }, // ← NEW: Required for Neon SSL connections
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
    refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY,
  },
  server: {
    port: parsePort(process.env.PORT, 'PORT'),
    nodeEnv: process.env.NODE_ENV,
  },
  email: {
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: parsePort(process.env.SMTP_PORT || '1025', 'SMTP_PORT'),
  },
};

module.exports = config;

// EXAMPLE IMPORT USAGE:
// const config = require('./config');
// const pool = new Pool({ connectionString: config.db.url, ssl: config.db.ssl });
// const token = jwt.sign({ id: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiry });
// app.listen(config.server.port);