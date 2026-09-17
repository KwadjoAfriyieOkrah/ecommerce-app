-- ============================================================================
-- schema.sql: PostgreSQL database schema for the e-commerce authentication layer
-- ============================================================================
-- PURPOSE:
--   - Defines the tables used to register users, store password hashes, and
--     track active login sessions for authenticated requests.
--   - This schema supports the backend auth flow: registration, login, token
--     validation, and logout/session cleanup.
--
-- WHY THIS APPROACH:
--   - A relational schema keeps user data and session data structured and easy to
--     validate with database constraints.
--   - We use PostgreSQL because the project requires ACID compliance, strong SQL
--     support, and reliable relational integrity for authentication data.
--
-- SECURITY CONSIDERATIONS:
--   - Passwords are never stored in plain text; bcrypt hashing protects them.
--   - All queries should use parameterized statements in application code to stop
--     SQL injection attacks.
--   - Foreign keys ensure a session cannot exist without a valid user record.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: users
-- ---------------------------------------------------------------------------
-- WHY THIS TABLE EXISTS:
--   - We store each account in one place so the app can look up a user by email,
--     validate credentials, and attach session records to the correct account.
--   - The table holds authentication data and basic profile information needed for
--     login, user identity, and communication.
--
-- DATA TYPE CHOICES:
--   - id: SERIAL gives us an auto-incrementing integer primary key. This is a
--     simple and common pattern for user IDs in PostgreSQL because it creates a
--     unique identifier for each row without manually assigning values.
--   - email: VARCHAR(255) is a good choice because email addresses are text, but
--     we want a predictable maximum length. It also allows index creation for fast
--     lookups during login.
--   - password_hash: TEXT is used here because bcrypt hashes are stored as text
--     strings such as "$2a$10$...". A BYTEA column would also work for raw binary
--     storage, but bcrypt output is naturally string-based and easier to work with
--     in TEXT format.
--   - created_at / updated_at: TIMESTAMP WITH TIME ZONE is used to track when a
--     record was created and last updated. Timestamps are essential for auditing,
--     debugging, and potentially enforcing session or account policies.
--   - phone: VARCHAR(20) is used for a user contact number because it may contain
--     digits, punctuation, and an international format; it is not a numeric field
--     in the database sense.
--
-- SECURITY NOTES:
--   - NEVER store plain passwords. Passwords must be hashed before insertion using
--     bcrypt, which adds a salt and makes the stored value one-way and difficult
--     to reverse. If a database leak happens, attackers cannot read user passwords.
--   - This is why password_hash is not called password; the name clearly signals
--     that it contains a derived value and not the original secret.
--
-- WHY email is UNIQUE:
--   - An email address should identify one account in the system. If duplicate
--     emails were allowed, users could create multiple accounts with the same
--     login identity, causing confusion and authentication bugs.
--   - The database enforces uniqueness so the application does not have to guess
--     which user row to match during login.
--
-- WHY NOT DENORMALIZE:
--   - We do not duplicate user profile data across multiple tables because that can
--     create inconsistencies. One canonical users row holds the source of truth.
--   - This reduces storage waste and keeps updates simple: change the user once,
--     and related queries can reference the same id.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WHY THIS INDEX EXISTS:
--   - Without an index, the database would scan the entire users table to find a
--     matching email during login, which becomes slow as the table grows.
--   - With an index, PostgreSQL can jump directly to the relevant row, similar to
--     how a book index helps you find a topic quickly.
--   - Trade-off: indexes use extra disk space and require maintenance during writes,
--     but they dramatically speed up frequent lookups.
CREATE INDEX idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- TABLE: sessions
-- ---------------------------------------------------------------------------
-- WHY THIS TABLE EXISTS:
--   - Sessions let the backend track which users have been authenticated and when
--     their access token expires.
--   - This supports login persistence, user authorization checks, and logout or
--     forced expiration behavior.
--
-- DATA TYPE CHOICES:
--   - id: SERIAL provides a unique identifier for each session record.
--   - user_id: INTEGER NOT NULL is used because it references a user row. This is a
--     foreign key to users.id, so a session can only belong to a valid user.
--   - token: TEXT is used for JWT or session token strings because tokens are not
--     numeric values and can be long strings containing encoded data.
--   - expires_at: TIMESTAMP WITH TIME ZONE records when the session should no longer
--     be valid. This is important for security and for token lifecycle management.
--   - created_at: TIMESTAMP WITH TIME ZONE tracks when the session was issued.
--
-- WHY user_id is a FOREIGN KEY:
--   - A session without a user would be meaningless and dangerous, because it would
--     claim an authenticated identity that does not exist.
--   - PostgreSQL enforces referential integrity so invalid or orphaned sessions are
--     rejected before they can be stored.
--
-- WHY sessions exist:
--   - They let us identify authenticated users on protected routes, check token
--     expiry, and invalidate access when a user logs out or the token expires.
--   - This supports secure API flows without requiring a user to log in for every
--     request.
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- WHY THIS INDEX EXISTS:
--   - Most session checks happen by user_id when validating an authenticated user
--     or cleaning expired sessions.
--   - Without an index, the database would scan the sessions table for every user
--     lookup, which is inefficient for a busy application.
--   - Indexes reduce lookup time and keep the auth flow responsive even as session
--     data grows.
CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- SQL INJECTION PROTECTION NOTES
-- ---------------------------------------------------------------------------
-- WHY THIS MATTERS:
--   - User input should never be concatenated directly into SQL strings.
--   - Parameterized queries in the backend code (for example, using pg with $1, $2)
--     prevent attackers from injecting malicious SQL.
--
-- EXAMPLE:
--   - GOOD: SELECT * FROM users WHERE email = $1
--   - BAD: SELECT * FROM users WHERE email = '" + email + "'
--
-- This schema supports secure application code by making the relationships clear and
-- by enforcing data integrity using UNIQUE and FOREIGN KEY constraints.
