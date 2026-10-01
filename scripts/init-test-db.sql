-- Executed automatically on the first start of the docker-compose container.
-- The kanban_dev database is created by the postgres image itself; this file
-- only adds the database used by the test suite.
CREATE DATABASE kanban_test OWNER kanban;
