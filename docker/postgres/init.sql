-- ============================================================
--  PROCTO — PostgreSQL init script
--  Runs ONCE when the container is first created.
--  Prisma migrations handle the actual schema — this just
--  sets up extensions and sensible defaults.
-- ============================================================

-- UUID generation (Prisma uses this for UUID primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Faster text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Case-insensitive text type (useful for email uniqueness)
CREATE EXTENSION IF NOT EXISTS "citext";

-- Log that init ran
DO $$
BEGIN
  RAISE NOTICE 'PROCTO database initialized with extensions.';
END $$;