-- =============================================================================
-- Saludlink — read-only monitoring role for postgres_exporter (task 28)
-- -----------------------------------------------------------------------------
-- The postgres_exporter must NEVER connect as the app owner/superuser. This
-- creates a dedicated login role with the LEAST privilege the exporter needs:
--
--   * pg_monitor (PG10+) — a built-in role bundling read access to the
--     statistics views the exporter reads: pg_stat_activity, pg_stat_database,
--     pg_stat_replication, pg_stat_bgwriter, etc. No table data, no writes.
--   * CONNECT on the databases the exporter scrapes. With
--     PG_EXPORTER_AUTO_DISCOVER_DATABASES=true the exporter opens one connection
--     per non-template database, so CONNECT is granted on each real DB.
--
-- The role gets NO CREATEDB/CREATEROLE/SUPERUSER and cannot read application
-- tables — pg_monitor exposes aggregate statistics only, so no PHI is reachable.
--
-- Idempotent: safe to re-run (creates the role if absent, otherwise just resets
-- the password + re-grants). Pass the password as a psql variable so no secret
-- is committed to the repo:
--
--   psql -h <host> -U <admin> -d postgres \
--        -v exporter_password=CHANGE_ME_STRONG \
--        -f exporter-role.sql
--
-- In staging/production the password is injected from SSM / Secrets Manager at
-- apply time and must match PG_EXPORTER_DSN — never stored in this file.
-- =============================================================================

\set ON_ERROR_STOP on

-- Require the password variable; fail fast with a clear message otherwise.
\if :{?exporter_password}
\else
  \echo '>>> ERROR: pass the password, e.g.  -v exporter_password=CHANGE_ME_STRONG'
  \quit
\endif

-- Create the role if it does not exist, else just (re)set its password. psql
-- substitutes :'exporter_password' as a properly quoted SQL string literal.
SELECT NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'slink_exporter'
) AS need_create \gset

\if :need_create
  CREATE ROLE slink_exporter WITH LOGIN PASSWORD :'exporter_password';
\else
  ALTER ROLE slink_exporter WITH LOGIN PASSWORD :'exporter_password';
\endif

-- Ensure the role stays least-privilege even if it pre-existed with more.
-- INHERIT is kept ON so pg_monitor's read privileges apply automatically to the
-- exporter's session without an explicit SET ROLE.
ALTER ROLE slink_exporter
  WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT;

-- pg_monitor covers the statistics views the exporter reads.
GRANT pg_monitor TO slink_exporter;

-- CONNECT on every real (non-template) database, for auto-discovery.
DO $$
DECLARE
  db record;
BEGIN
  FOR db IN
    SELECT datname FROM pg_database
    WHERE datistemplate = false AND datallowconn = true
  LOOP
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO slink_exporter', db.datname);
  END LOOP;
END
$$;

-- Report the resulting posture (no secrets in output).
SELECT
  r.rolname,
  r.rolcanlogin  AS can_login,
  r.rolsuper     AS is_super,
  r.rolcreatedb  AS can_createdb,
  r.rolcreaterole AS can_createrole,
  pg_has_role('slink_exporter', 'pg_monitor', 'USAGE') AS has_pg_monitor
FROM pg_roles r
WHERE r.rolname = 'slink_exporter';
