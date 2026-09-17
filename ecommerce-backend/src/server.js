// ============================================================================
// server.js: Express application bootstrap for the e-commerce backend
// ============================================================================
// PURPOSE:
//   - This file creates the Express server, loads the application configuration,
//     mounts the API routes, and starts listening for incoming HTTP requests.
//   - It connects the major backend pieces together: config → database → services
//     → routes → server → client responses.
//
// WHY THIS APPROACH:
//   - The application should boot in a predictable order so dependencies exist
//     before routes are registered.
//   - Config loads first because routes and services rely on environment variables
//     like database credentials and JWT secrets.
//   - Alternative: creating routes and then reading config at random points would
//     make startup brittle and harder to debug.
//
// HOW COMPONENTS CONNECT:
//   1. config.js loads environment variables and validates required settings
//   2. database connection pool is created in db/connection.js
//   3. services contain the business logic such as hashing and JWT signing
//   4. routes handle HTTP requests and call service functions
//   5. server.js wires everything together and starts the app
//
// DEPENDENCIES:
//   - express: creates the HTTP server and request lifecycle
//   - cors: allows requests from a different frontend origin such as React
//   - ./config: central configuration object from environment variables
//   - ./routes/auth: authentication routes for register/login
//   - ./middleware/errorHandler: centralized error handling middleware
//
// SECURITY CONSIDERATIONS:
//   - Environment variables are loaded before startup to avoid missing credentials.
//   - The server returns generic errors to clients; detailed backend problems are
//     logged internally instead of exposed to the browser.
// ============================================================================

const express = require('express');
const cors = require('cors');

const config = require('./config');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const errorHandler = require('./middleware/errorHandler');

// CREATE EXPRESS APP.
// - app is the central Express instance that handles incoming HTTP requests.
// - It is where all middleware, routes, and error handlers are registered.
const app = express();

// WHY CORS IS IMPORTANT:
// - CORS stands for Cross-Origin Resource Sharing.
// - Browsers block JavaScript from one origin from calling APIs on another origin
//   unless the server explicitly allows it.
// - Example: React app on http://localhost:3000 calling API on http://localhost:5000
//   is different-origin traffic, so without CORS the browser blocks the request.
// - With cors(), the backend allows those cross-origin requests to pass.
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// WHY express.json()?
// - express.json() parses incoming JSON request bodies into a JavaScript object.
// - Example: a client sends { email: 'user@example.com', password: 'secret123' }
// - Without this middleware, req.body would be undefined and the route cannot read
//   the email or password.
// - We can add other body parsers later for XML, URL-encoded formats, or file uploads
//   if the application grows.
app.use(express.json());

// WHY ROUTE MOUNTING MATTERS:
// - app.use('/api/auth', authRoutes) attaches all routes in authRoutes under the
//   /api/auth prefix.
// - Example: a route defined as POST /register becomes POST /api/auth/register.
// - This keeps the API organized by feature and makes it easy to add later modules
//   such as /api/products, /api/cart, and /api/orders.
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// 404 HANDLER: ROUTE NOT FOUND.
// - If the client requests a URL that does not match any defined route, we handle
//   it here instead of letting Express send the default, less-friendly response.
// - This is important for user feedback and API consistency.
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// ERROR HANDLER MIDDLEWARE (MUST BE LAST).
// - Express tries routes first.
// - If a route throws or calls next(error), Express passes the error to the next
//   middleware.
// - The centralized error handler catches errors from any route and sends a safe
//   response to the client without leaking internals like database messages or stack
//   traces.
app.use(errorHandler);

// START THE SERVER.
// - app.listen(port) begins accepting HTTP requests on the configured port.
// - The port comes from config.server.port, which reads the value from the .env file.
// - If the port is already in use, the app will fail to start and the developer must
//   choose a different port in the environment file.
const port = config.server.port;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// BONUS: GRACEFUL SHUTDOWN.
// - In production, a server can receive a SIGTERM or SIGINT signal when the OS is
//   stopping the process or a deployment is happening.
// - We can close open database connections and allow pending requests to finish.
// - This avoids abrupt shutdowns that could drop in-flight work or leave resources
//   hanging.
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;

// EXAMPLE STARTUP OUTPUT:
// Server running on http://localhost:5000
//
// WHY THIS OUTPUT MATTERS:
// - It confirms the app started successfully and is listening on the configured port.
// - If this does not appear, the process likely failed due to port conflict, missing
//   environment variables, or a runtime error during boot.
