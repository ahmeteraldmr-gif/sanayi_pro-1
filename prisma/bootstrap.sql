-- Run ONCE as the database administrator in a NEW Supabase project.
-- No passwords here. Set distinct login passwords outside source control.
-- Does not alter/drop existing application tables or Supabase Auth objects.
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['sanayipro_migrator', 'sanayipro_runtime', 'sanayipro_onboarding'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION', role_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication OR rolinherit)) THEN
      RAISE EXCEPTION 'Unsafe existing role: %; inspect manually before proceeding', role_name;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = role_name) THEN
      RAISE EXCEPTION 'Role % must not inherit or SET ROLE into other roles', role_name;
    END IF;
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), role_name);
  END LOOP;
END $$;

CREATE SCHEMA IF NOT EXISTS sanayipro AUTHORIZATION sanayipro_migrator;
DO $$ BEGIN
  IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'sanayipro') <> 'sanayipro_migrator' THEN
    RAISE EXCEPTION 'Existing sanayipro schema has a different owner; inspect manually';
  END IF;
END $$;
REVOKE ALL ON SCHEMA sanayipro FROM PUBLIC;
GRANT USAGE ON SCHEMA sanayipro TO sanayipro_runtime, sanayipro_onboarding;
GRANT USAGE ON SCHEMA auth TO sanayipro_migrator, sanayipro_runtime, sanayipro_onboarding;
GRANT REFERENCES (id) ON auth.users TO sanayipro_migrator;
GRANT EXECUTE ON FUNCTION auth.uid() TO sanayipro_migrator, sanayipro_runtime, sanayipro_onboarding;
-- This private schema is intentionally NOT exposed through the Data API.
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA sanayipro FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
