// ============================================================================
// authService.js: Authentication business logic for password hashing and JWT management
// ============================================================================
// PURPOSE:
//   - This file handles the core authentication logic used by the backend.
//   - It hashes passwords before they are saved, verifies submitted passwords, and
//     signs/verifies JWT tokens for protected routes.
//
// WHY THIS APPROACH:
//   - Routes are responsible for receiving HTTP requests and sending HTTP responses.
//   - Services are responsible for business logic, such as password hashing and
//     token handling. This separation keeps code easier to test and reuse.
//   - Alternative: put hashing and JWT logic directly in route handlers. That would
//     create duplicate logic and make the code harder to maintain.
//
// DEPENDENCIES:
//   - bcryptjs: used to hash and compare passwords securely with a salt.
//   - jsonwebtoken: used to sign and verify JWT tokens for API authentication.
//   - ../config: provides environment variables such as JWT secret and expiry.
//
// SECURITY CONSIDERATIONS:
//   - Passwords are never stored in plain text.
//   - JWT secrets are kept in environment variables, not hardcoded.
//   - Token verification rejects expired or tampered tokens.
// ============================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: hashPassword(plainPassword)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Takes a plain-text password entered by the user and securely converts it into
//     a bcrypt hash.
//   - The hash contains the password plus a unique random salt, which makes it
//     expensive and difficult for attackers to brute-force.
//
// PARAMETERS:
//   - plainPassword (string) — the raw password provided by the user during signup
//     or login.
//
// RETURNS:
//   - A bcrypt hash string that can be safely stored in the database.
//
// WHY THIS APPROACH:
//   - bcryptjs is designed for password hashing. It includes a built-in salt and is
//     intentionally slow to make brute force attacks impractical.
//   - We use bcrypt instead of fast hashing algorithms like MD5 or SHA1 because
//     those run too quickly and can be cracked with massive GPU or dictionary-based
//     attacks.
//   - A salt is random data added before hashing. It prevents attackers from using
//     rainbow tables or precomputed hash lists across many users.
//   - This is a security best practice for authentication systems.
//
// EXAMPLE USAGE:
//   const hashedPassword = await hashPassword('secret123');
//   // Store hashedPassword in the database
//
// WHY HASHED DATA IS SAFER:
//   - If a database is breached, attackers receive bcrypt hashes, not the actual
//     passwords.
//   - Because the hash is salted and computationally expensive, stolen hashes are
//     far less useful than plain passwords.
//
// EXAMPLE FLOW:
//   plainPassword 'secret123' -> add random salt -> bcryptjs hash -> stored value
//   Example result: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldMSJdsf...
// ────────────────────────────────────────────────────────────────────────
async function hashPassword(plainPassword) {
  // WHY bcryptjs?
  // - bcryptjs adds a random salt automatically to the password before hashing.
  // - The cost factor (for example, 10) makes hashing intentionally slow.
  // - This means each password check takes around 100ms, which is slow enough to
  //   significantly discourage brute-force attacks.
  // - Attackers can no longer try millions of guesses per second because each hash
  //   calculation is computationally expensive.
  
  // WHY NOT md5 or SHA1?
  // - They are fast and designed for speed, not password security.
  // - Modern attackers can test millions of combinations per second on GPUs.
  // - They also do not include a unique salt by default, which makes precomputed
  //   attacks much easier.

  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: verifyPassword(plainPassword, hash)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Takes the password that the user entered during login and compares it against
//     the stored bcrypt hash.
//   - It rehashes the entered password with the stored salt and checks whether the
//     resulting hash matches.
//
// PARAMETERS:
//   - plainPassword (string) — password submitted by the client
//   - hash (string) — password hash stored in the database
//
// RETURNS:
//   - true if the password matches the hash
//   - false if it does not match
//
// WHY THIS APPROACH:
//   - bcrypt uses the stored salt to verify passwords. This ensures the same input
//     password produces the same password hash only when the same salt is used.
//   - We compare using a constant-time comparison to reduce timing attack risk.
//   - Timing attacks try to infer the password by measuring tiny differences in
//     response times, so constant-time comparison helps protect against that class
//     of attacks.
//
// EXAMPLE USAGE:
//   const isValid = await verifyPassword('secret123', storedHash);
//   if (isValid) {
//     // Allow user to log in
//   }
// ────────────────────────────────────────────────────────────────────────
async function verifyPassword(plainPassword, hash) {
  // WHY THIS WORKS:
  // - bcrypt compares the plain password against the stored hash using the original
  //   random salt embedded in the hash.
  // - If the password is correct, the generated hash matches the one stored.
  // - If the password is wrong, the comparison fails.
  return bcrypt.compare(plainPassword, hash);
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: generateJWTToken(userId)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Creates a signed JSON Web Token (JWT) for a user.
//   - The token usually contains a user identifier and an expiration time.
//
// PARAMETERS:
//   - userId (number|string) — the database id or unique user identifier to embed
//     in the token
//
// RETURNS:
//   - A signed JWT string that can be sent to the client.
//
// WHY THIS APPROACH:
//   - JWTs are stateless, so the server does not need to keep a server-side session
//     record for every logged-in user.
//   - This makes the backend easier to scale horizontally because any server can
//     validate the token using the same secret key.
//   - The token is signed with HMAC using the JWT secret, which proves the token was
//     created by this server and not tampered with.
//
// WHAT IS A JWT?
//   - JWT stands for JSON Web Token.
//   - It has three parts: header.payload.signature.
//   - The header says what algorithm is used, the payload holds user data, and the
//     signature proves the token was not changed.
//
// WHAT IS THE SIGNATURE?
//   - The signature is a hash created from the encoded header, encoded payload, and
//     secret key.
//   - If someone modifies the payload, the signature no longer matches and the
//     server rejects the token.
//
// EXAMPLE USAGE:
//   const token = generateJWTToken(user.id);
//   res.setHeader('Authorization', `Bearer ${token}`);
//
// HOW IT WORKS IN REAL FLOW:
//   1. User logs in successfully.
//   2. Server creates JWT containing userId and expiry.
//   3. Client stores the token and sends it in the Authorization header.
//   4. Protected routes verify the signature before allowing access.
//   5. If token is expired or tampered, the server rejects it.
//
// TOKEN EXPIRATION:
//   - We set a short expiration time, such as 1 hour, so stolen tokens become less
//     useful over time.
//   - The user must log in again when the token expires.
// ────────────────────────────────────────────────────────────────────────
function generateJWTToken(userId) {
  // WHY USE JWT SECRET FROM CONFIG?
  // - Secrets must never be hardcoded in source code.
  // - Using config.jwt.secret keeps the application environment-specific and keeps
  //   credentials out of the repository.
  // - If the secret changes, all previously signed tokens become invalid.
  const expiresIn = config.jwt.expiry || '1h';

  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn,
  });
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: verifyJWTToken(token)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Verifies the signature on a JWT and returns the payload if the token is valid.
//   - It rejects expired, malformed, or tampered tokens.
//
// PARAMETERS:
//   - token (string) — JWT sent by the client in the Authorization header
//
// RETURNS:
//   - The decoded payload, usually containing the userId
//
// WHY THIS APPROACH:
//   - We trust only tokens that match the server secret and have not expired.
//   - If the token is expired, invalid, or tampered with, we throw an error so the
//     route can respond with the correct 401 status.
//   - This is the foundation of stateless authentication in the backend.
//
// EXAMPLE USAGE:
//   const payload = verifyJWTToken(token);
//   const userId = payload.userId;
//
// WHAT HAPPENS ON FAILURE:
//   - Expired token: throws an error because the time check fails.
//   - Tampered token: throws an error because the signature does not match.
//   - Missing secret: throws an error because the server cannot verify the token.
// ────────────────────────────────────────────────────────────────────────
function verifyJWTToken(token) {
  // jwt.verify will throw when:
  // - the token is expired
  // - the token signature is invalid
  // - the secret is missing or wrong
  // - the token is malformed
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    // We rethrow so the route or middleware can convert this into an HTTP 401.
    // This keeps the security layer centralized and avoids exposing low-level token
    // details to the client.
    throw new Error('Invalid or expired token');
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateJWTToken,
  verifyJWTToken,
};

// SUMMARY:
// - hashPassword stores a secure, salted password hash instead of plain text.
// - verifyPassword checks a submitted password against the stored hash.
// - generateJWTToken issues a signed token so clients can authenticate future
//   requests without the server storing a full session.
// - verifyJWTToken ensures only valid, non-expired, untampered tokens are trusted.
