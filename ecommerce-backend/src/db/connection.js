// ============================================================================
// connection.js: PostgreSQL connection pool for the e-commerce backend
// ============================================================================
// PURPOSE:
//   - This file manages the database connection layer for the application.
//   - It creates and exports a reusable PostgreSQL connection pool so routes and
//     services can run queries without manually opening a new connection each time.
//
// WHY THIS APPROACH:
//   - Creating a new database connection per request is slow and wasteful.
//   - A pool keeps a small set of reusable connections alive so queries can start
//     immediately when needed. This is the standard pattern for production Node.js
//     applications using PostgreSQL.
//
// CONNECTION POOLING BENEFITS:
//   - Reuses existing connections instead of creating a new connection for every
//     request, which reduces latency and lowers resource usage.
//   - Fewer TCP handshakes and database sessions means faster queries and lower
//     server overhead.
//   - Trade-off: there is some initial setup cost when the pool is created, but the
//     performance gain is immediate under real application traffic.
//
// SECURITY CONSIDERATIONS:
//   - Credentials come from environment variables, not hardcoded into the source.
//   - Database errors should be caught by calling code and not exposed directly to
//     clients, to avoid leaking internal connection details.
// ============================================================================
const { Pool } = require('pg');
const config = require('../config');

// WHAT IS A CONNECTION?
// - A connection is a live TCP socket between the Node.js app and the PostgreSQL
//   server.
// - This socket allows the app to send SQL queries and receive results.
// - Opening a database connection is expensive because it involves network setup,
//   authentication, and server-side session creation.

// WHAT IS A POOL?
// - A pool is a collection of reusable database connections, similar to a parking
//   lot where cars return after the trip instead of leaving the lot every time.
// - PostgreSQL connections are limited resources, so sharing a small pool avoids
//   overwhelming the database server.
// - A typical production pool may start with 5-20 connections depending on traffic,
//   and the default is often 10 unless configured otherwise.

// WHY POOLING IS FASTER:
// - Creating a connection can take around 100ms or more depending on the server,
//   network latency, and database load.
// - Reusing an existing connection may take less than 1ms because the network and
//   authentication work have already been done.
// - After a query completes, the connection is returned to the pool and can be used
//   again immediately.

// WHY NOT CREATE A NEW CONNECTION PER REQUEST?
// - If 100 requests each open a new connection, the total cost is roughly:
//   100 requests * 100ms = 10 seconds of connection overhead.
// - With connection pooling, 100 requests can share a pool of 10 connections and
//   complete in a fraction of that time.
// - Industry standard: production applications almost always use a pool because it
//   is more scalable, resource-efficient, and easier to manage.

// CREATE THE POOL USING A SINGLE CONNECTION STRING (Neon format).
// - config.db.url is the full PostgreSQL connection string from the .env file.
// - This works for both local PostgreSQL and Neon (hosted PostgreSQL).
// - config.db.ssl is required for Neon because it uses SSL connections.
const pool = new Pool({
  connectionString: config.db.url,  // ← CHANGED: Single connection string
  ssl: config.db.ssl,               // ← NEW: SSL config for Neon
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ERROR HANDLING FOR POOL CREATION AND CONNECTION ISSUES.
// - If PostgreSQL is down, the pool may emit an error when trying to connect.
// - If credentials are wrong, the first connection attempt will fail and throw.
// - The right pattern is to wrap database operations in try/catch in route or
//   service files so the app can respond with a safe error message instead of
//   crashing.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;

// EXAMPLE USAGE:
// const pool = require('./db/connection');
// const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
//
// WHY THIS PATTERN WORKS:
// - A route or service imports the shared pool.
// - The pool manages a collection of database connections behind the scenes.
// - Each query runs on an available connection, then the connection returns to the
//   pool automatically when finished.
// - This keeps the backend efficient without needing to manually open and close a
//   connection on every request.