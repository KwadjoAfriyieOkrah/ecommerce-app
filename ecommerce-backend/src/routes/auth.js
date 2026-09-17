// ============================================================================
// auth.js: HTTP routes for user registration and login
// ============================================================================
// PURPOSE:
//   - This file exposes the authentication endpoints for the backend API.
//   - It handles client requests for register and login, calls business logic from
//     the auth service, and returns JSON responses to the client.
//
// WHY THIS APPROACH:
//   - Routes are responsible for HTTP concerns: parsing requests, validating input,
//     and returning status codes and JSON.
//   - Business logic lives in services so it can be reused and tested separately.
//   - Alternative: putting database queries and password logic directly inside route
//     handlers would make the code repetitive and harder to maintain.
//
// HOW REQUESTS FLOW:
//   - Client sends POST /api/auth/register or /api/auth/login
//   - Route receives the request and validates the body
//   - Route calls authService functions for password hashing or JWT generation
//   - Database queries run through the PostgreSQL pool
//   - Service returns data to the route
//   - Route sends the final JSON response to the client
//
// DEPENDENCIES:
//   - express: creates the router and exposes the request/response API.
//   - ../db/connection: shared PostgreSQL pool for database queries.
//   - ../services/authService: password hashing, password verification, and token logic.
//
// SECURITY CONSIDERATIONS:
//   - All SQL is parameterized to prevent SQL injection.
//   - Passwords are never stored in plaintext.
//   - Authentication errors return generic messages instead of revealing whether an
//     email exists or which password field was wrong.
// ============================================================================

const express = require('express');
const router = express.Router();

const pool = require('../db/connection');
const authService = require('../services/authService');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = authService.verifyJWTToken(token);
    req.user = { id: payload.userId };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/auth/register
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Creates a new user account from the submitted signup form data.
//   - Validates the request body, checks that the email is not already in use, and
//     hashes the password before inserting the row into the database.
//
// REQUEST BODY:
//   - { email, password, name, phone }
//
// RESPONSE:
//   - 201 Created
//   - { success: true, message: 'Account created', user: { id, email, name } }
//
// WHY THIS APPROACH:
//   - The backend must validate inputs because clients can be bypassed or modified.
//   - Frontend validation is helpful for UX, but it is not security. Attackers can
//     send malicious requests directly to the server and skip the browser entirely.
//   - Checking for duplicate emails prevents multiple accounts with the same login
//     identity and avoids confusion during login or password resets.
//
// EXAMPLE USAGE:
//   POST /api/auth/register
//   Body: { email: 'kwadjo@example.com', password: 'secret123', name: 'Kwadjo', phone: '+233123456789' }
// ────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body || {};

    // VALIDATION: EMAIL IS REQUIRED AND MUST BE IN A VALID FORMAT.
    // - The backend validates because browser checks can be bypassed.
    // - If a client sends empty data or malformed values, the server should reject
    //   it with a 400 Bad Request before touching the database.
    //
    // WHY validate on backend?
    // - Frontend validation is convenience, not security.
    // - A malicious user can craft a request with code that bypasses the browser UI.
    // - The database, not the browser, is the final authority for safe data.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // DATABASE CHECK: PREVENT DUPLICATE ACCOUNT CREATION.
    // - We query by email before creating a user to avoid duplicate accounts.
    // - The query uses a parameterized statement so the database treats the email as
    //   a value, not as part of the SQL logic.
    //
    // WHY PARAMETERIZED QUERIES?
    // - String concatenation is unsafe. For example:
    //   'SELECT * FROM users WHERE email = ' + email
    // - An attacker could send an email like:
    //   '; DROP TABLE users; --
    // - The query would become destructive SQL.
    // - Parameterized query:
    //   'SELECT * FROM users WHERE email = $1'
    //   with [email]
    // - This keeps special characters safe and prevents injection.
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // PASSWORD HASHING: NEVER STORE PLAIN PASSWORDS.
    // - We call authService.hashPassword(password) so the application stores a
    //   bcrypt hash, not the actual password.
    // - If the database is ever leaked, attackers only get a hashed value, which is
    //   far less useful than the real password.
    const passwordHash = await authService.hashPassword(password);

    // INSERT USER INTO DATABASE.
    // - We include only the required fields.
    // - We do not store the plain password.
    const insertResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, phone`,
      [email.trim().toLowerCase(), passwordHash, name.trim(), phone || null]
    );

    const user = insertResult.rows[0];

    // RESPONSE: 201 CREATED WITH SAFE USER DATA ONLY.
    // - We return id, email, and name only.
    // - We intentionally exclude password_hash and any plain password fields.
    return res.status(201).json({
      success: true,
      message: 'Account created',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    // TRY/CATCH ERROR HANDLING:
    // - Database connection problems, unexpected query failures, and hash errors are
    //   sent to Express error middleware.
    // - This keeps route code clean and ensures a consistent 500 response for server
    //   errors while keeping internal details out of the public API.
    next(error);
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/auth/login
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Verifies the submitted credentials and issues a JWT if the user is valid.
//   - This is the login route used to authenticate users for subsequent requests.
//
// REQUEST BODY:
//   - { email, password }
//
// RESPONSE:
//   - 200 OK
//   - { success: true, token: 'JWT_HERE' }
//
// WHY THIS APPROACH:
//   - The backend compares the submitted password to the stored hash instead of
//     storing or comparing plain passwords.
//   - After successful login, the server issues a token that the client can send in
//     future requests for protected resources.
//
// EXAMPLE USAGE:
//   POST /api/auth/login
//   Body: { email: 'kwadjo@example.com', password: 'secret123' }
// ────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // VALIDATION: CHECK BOTH FIELDS ARE PRESENT.
    // - We return a generic message so the API does not reveal whether a specific
    //   email or password field was missing.
    if (!email || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // DATABASE LOOKUP: FIND THE USER BY EMAIL.
    // - We query only the id, email, and password_hash fields needed for login.
    // - We do not return the user's password in plain text.
    // - Query uses parameterized values to prevent SQL injection.
    const userResult = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    const user = userResult.rows[0];

    // GENERIC AUTH FAILURE RESPONSE.
    // - If no user is found, we return the same generic error message to avoid user
    //   enumeration.
    // - Attackers should not be able to tell whether an email exists in the system.
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // PASSWORD VERIFICATION:
    // - The login route compares the submitted password against the stored bcrypt hash.
    // - We never compare plain passwords directly because plain-text password
    //   handling is a major security risk.
    const isPasswordValid = await authService.verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // TOKEN GENERATION:
    // - Once the password is verified, the server issues a JWT.
    // - JWTs are stateless: the server does not need to maintain a session table for
    //   every logged-in user.
    // - The client stores the token and sends it with future requests.
    const token = authService.generateJWTToken(user.id);

    return res.status(200).json({
      success: true,
      token,
    });
  } catch (error) {
    // ERROR HANDLING:
    // - All unexpected failures are sent to the centralized Express error middleware.
    // - Validation issues are handled inline with 400/401 responses.
    // - Database and server failures become 500 responses in the middleware.
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userResult = await pool.query(
      `SELECT id, email, name, phone, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, phone } = req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const safePhone = phone ? String(phone).trim() : null;

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           phone = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, name, phone, created_at, updated_at`,
      [String(name).trim(), safePhone, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// WHY THIS ROUTE FILE MATTERS:
// - It turns HTTP requests into secure backend actions.
// - It keeps validation, database checks, password hashing, and token generation in
//   a predictable flow that is easy to reason about and test.
// - This gives the rest of the app a clean auth endpoint layer for future features
//   like protected routes, logout, and account management.
