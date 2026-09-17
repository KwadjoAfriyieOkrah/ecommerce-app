// ============================================================================
// errorHandler.js: Centralized Express error middleware for the backend
// ============================================================================
// PURPOSE:
//   - Catches errors raised anywhere in the request lifecycle and returns a
//     consistent HTTP response to the client.
//   - Keeps error handling logic in one place instead of repeating try/catch in
//     every route.
//
// WHY THIS APPROACH:
//   - Centralized middleware makes the API consistent: every route returns a
//     predictable structure and status code.
//   - It is easier to maintain than placing ad hoc error handling in each route.
//   - Trade-off: a small bit of setup is required, but it prevents common bugs like
//     forgotten try/catch blocks, inconsistent status codes, and leaked internals.
//
// SECURITY CONSIDERATIONS:
//   - Never log or return raw passwords, JWTs, or database error strings.
//   - Never send stack traces to clients because they reveal code structure and
//     infrastructure details.
//   - Error responses should be generic to the public, while internal logs can be
//     detailed for developers.
// ============================================================================

// WHY THIS MIDDLEWARE SIGNATURE?
// - Express error handlers receive exactly four arguments: (err, req, res, next).
// - This tells Express the function is meant to handle thrown errors from routes,
//   middleware, or async code.
// - We keep the final parameter even if not used, because Express identifies it
//   as an error handler by the number and order of arguments.
function errorHandler(err, req, res, next) {
  // LOG THE ERROR SECURELY.
  // - We log details for internal debugging, but we remove sensitive values before
  //   writing anything to logs.
  // - A password, JWT, or raw database stack trace should never be exposed in the
  //   terminal or production logs.
  const timestamp = new Date().toISOString();
  const sanitizedPath = req.originalUrl || req.url || 'unknown-path';
  const sanitizedIp = req.ip || 'unknown-ip';

  // We do not log raw request bodies because they may contain passwords.
  // Instead, we log only the metadata needed for debugging and incident review.
  const safeLog = {
    timestamp,
    method: req.method,
    path: sanitizedPath,
    ip: sanitizedIp,
    message: err.message,
    name: err.name,
  };

  console.error('Error caught by middleware:', safeLog);

  // DEFINE A DEFAULT STATUS IN CASE THE ERROR TYPE IS UNKNOWN.
  // - A generic server error fallback is better than exposing internal failures.
  let statusCode = 500;
  let message = 'Something went wrong, please try again';

  // 1. VALIDATION ERRORS (400 Bad Request)
  // - When: user sends invalid input such as an empty email, missing password,
  //   malformed phone number, or a request body that fails validation.
  // - What to log: the error message and the field that failed.
  // - What to return: a clear but safe message for the client, such as
  //   { error: 'Email is required' }.
  //
  // EXAMPLE:
  // const err = new Error('Email is required');
  // err.statusCode = 400;
  // throw err;
  if (err.statusCode === 400 || err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message || 'Invalid input';

    // In production, we may want to log the exact validation field for debugging,
    // but we should not reveal sensitive internals to the caller.
    console.error('Validation failed:', {
      timestamp,
      path: sanitizedPath,
      ip: sanitizedIp,
      field: err.field || 'unknown-field',
    });
  }

  // 2. AUTHENTICATION ERRORS (401 Unauthorized)
  // - When: invalid login credentials, missing token, expired token, or token with
  //   invalid signature.
  // - What to log: a generic security event such as 'Failed login attempt from IP X'.
  // - What to return: { error: 'Invalid credentials' } to avoid telling the client
  //   which identity field was wrong.
  //
  // EXAMPLE:
  // const err = new Error('Invalid token');
  // err.statusCode = 401;
  // throw err;
  else if (err.statusCode === 401 || err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Invalid credentials';

    console.warn('Authentication failure:', {
      timestamp,
      path: sanitizedPath,
      ip: sanitizedIp,
      reason: err.message,
    });
  }

  // 3. NOT FOUND ERRORS (404 Not Found)
  // - When: the client requests a resource that does not exist, such as a missing
  //   user profile or product ID.
  // - What to log: details such as the missing resource and related ID.
  // - What to return: { error: 'Resource not found' }.
  //
  // EXAMPLE:
  // const err = new Error('User not found');
  // err.statusCode = 404;
  // throw err;
  else if (err.statusCode === 404 || err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';

    console.error('Resource not found:', {
      timestamp,
      path: sanitizedPath,
      ip: sanitizedIp,
      resource: err.resource || 'unknown-resource',
      identifier: err.identifier || null,
    });
  }

  // 4. SERVER ERRORS (500 Internal Server Error)
  // - When: the database is down, unexpected logic errors occur, or an unhandled
  //   exception escapes a route.
  // - What to log: full stack trace, timestamp, request details, and any useful
  //   metadata needed to debug the issue.
  // - What to return: { error: 'Something went wrong, please try again' }
  //   because database details and stack traces are sensitive.
  //
  // EXAMPLE ERROR FLOW:
  // Route handler throws error
  // throw new Error('Database connection failed');
  // Error bubbles to middleware
  // Middleware logs securely: 'Database error at 2024-01-15 10:30:00'
  // Client receives: { error: 'Something went wrong, please try again' }
  else {
    statusCode = 500;
    message = 'Something went wrong, please try again';

    // IMPORTANT SECURITY RULE:
    // - Never include err.stack or raw database errors in the client response.
    // - Only log them internally for dev troubleshooting.
    console.error('Unhandled server error:', {
      timestamp,
      path: sanitizedPath,
      ip: sanitizedIp,
      stack: err.stack,
      message: err.message,
    });
  }

  // SEND A GENERIC YET USEFUL RESPONSE TO THE CLIENT.
  // - The public API should never reveal database internals, stack traces, or query
  //   errors because attackers can use this information to probe the server.
  res.status(statusCode).json({
    error: message,
  });
}

module.exports = errorHandler;

// EXAMPLE USAGE IN ROUTES:
// app.use((err, req, res, next) => {
//   errorHandler(err, req, res, next);
// });
//
// WHY THIS IS IMPORTANT:
// - All routes can throw errors without having to manually format HTTP responses.
// - This keeps application code cleaner and ensures error handling is consistent
//   across the project.
