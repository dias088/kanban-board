-- Local PostgreSQL setup (alternative to docker-compose).
-- Run once as a superuser:
--   psql -U postgres -h 127.0.0.1 -f scripts/init-local-db.sql
--
-- Creates the `kanban` role plus kanban_dev / kanban_test databases with the
-- same credentials docker-compose uses, so DATABASE_URL from .env.example
-- works with either setup. Safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kanban') THEN
    -- CREATEDB is required by `prisma migrate dev` for its shadow database
    CREATE ROLE kanban WITH LOGIN PASSWORD 'kanban' CREATEDB;
  END IF;
END
$$;

SELECT 'CREATE DATABASE kanban_dev OWNER kanban'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'kanban_dev')\gexec

SELECT 'CREATE DATABASE kanban_test OWNER kanban'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'kanban_test')\gexec
