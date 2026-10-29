-- Additive initial migration. Connect ONLY as sanayipro_migrator.
-- Bootstrap roles/schema with prisma/bootstrap.sql first.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'sanayipro_migrator' THEN
    RAISE EXCEPTION 'Migration requires the separate sanayipro_migrator login';
  END IF;
END $$;

CREATE TABLE sanayipro.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now()
);
CREATE TABLE sanayipro.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now()
);
CREATE TABLE sanayipro.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES sanayipro.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id)
);
CREATE INDEX branches_organization_id_idx ON sanayipro.branches(organization_id);
CREATE TABLE sanayipro.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES sanayipro.organizations(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE(id, organization_id),
  UNIQUE(organization_id, code)
);
CREATE TABLE sanayipro.permissions (
  code text PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE sanayipro.role_permissions (
  organization_id uuid NOT NULL,
  role_id uuid NOT NULL,
  permission_code text NOT NULL REFERENCES sanayipro.permissions(code) ON DELETE RESTRICT,
  PRIMARY KEY(role_id, permission_code),
  FOREIGN KEY(role_id, organization_id) REFERENCES sanayipro.roles(id, organization_id) ON DELETE RESTRICT
);
CREATE TABLE sanayipro.organization_memberships (
  organization_id uuid NOT NULL REFERENCES sanayipro.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES sanayipro.user_profiles(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(organization_id, user_id),
  FOREIGN KEY(role_id, organization_id) REFERENCES sanayipro.roles(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX organization_memberships_user_id_idx ON sanayipro.organization_memberships(user_id);
CREATE TABLE sanayipro.branch_memberships (
  branch_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(branch_id, user_id),
  FOREIGN KEY(branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY(organization_id, user_id) REFERENCES sanayipro.organization_memberships(organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY(role_id, organization_id) REFERENCES sanayipro.roles(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX branch_memberships_organization_id_user_id_idx ON sanayipro.branch_memberships(organization_id, user_id);

INSERT INTO sanayipro.permissions(code, name) VALUES
  ('app.access', 'Demo uygulama alanına erişim'),
  ('tenant.read', 'Seçili işletme ve şube temelini okuma');

-- SECURITY INVOKER only: no recursive definer/owner bypass is used.
CREATE FUNCTION sanayipro.selected_organization() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT nullif(current_setting('app.organization_id', true), '')::uuid
$$;
CREATE FUNCTION sanayipro.selected_branch() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT nullif(current_setting('app.branch_id', true), '')::uuid
$$;

-- Self-membership discovery is allowed without a tenant selection. All other
-- organization/branch reads remain membership-limited and narrow once selected.
CREATE POLICY profile_self ON sanayipro.user_profiles FOR SELECT TO sanayipro_runtime
USING (id = auth.uid() AND active);
CREATE POLICY organization_membership_self ON sanayipro.organization_memberships FOR SELECT TO sanayipro_runtime
USING (user_id = auth.uid() AND active
  AND (sanayipro.selected_organization() IS NULL OR organization_id = sanayipro.selected_organization())
  AND EXISTS (SELECT 1 FROM sanayipro.user_profiles p WHERE p.id = user_id));
CREATE POLICY branch_membership_self ON sanayipro.branch_memberships FOR SELECT TO sanayipro_runtime
USING (user_id = auth.uid() AND active
  AND (sanayipro.selected_organization() IS NULL OR organization_id = sanayipro.selected_organization())
  AND (sanayipro.selected_branch() IS NULL OR branch_id = sanayipro.selected_branch())
  AND EXISTS (SELECT 1 FROM sanayipro.organization_memberships m WHERE m.organization_id = branch_memberships.organization_id AND m.user_id = auth.uid()));
CREATE POLICY organization_member_read ON sanayipro.organizations FOR SELECT TO sanayipro_runtime
USING (active
  AND (sanayipro.selected_organization() IS NULL OR id = sanayipro.selected_organization())
  AND EXISTS (SELECT 1 FROM sanayipro.organization_memberships m WHERE m.organization_id = organizations.id AND m.user_id = auth.uid()));
CREATE POLICY branch_member_read ON sanayipro.branches FOR SELECT TO sanayipro_runtime
USING (active
  AND (sanayipro.selected_organization() IS NULL OR organization_id = sanayipro.selected_organization())
  AND (sanayipro.selected_branch() IS NULL OR id = sanayipro.selected_branch())
  AND EXISTS (SELECT 1 FROM sanayipro.organizations o WHERE o.id = branches.organization_id)
  AND EXISTS (SELECT 1 FROM sanayipro.branch_memberships m WHERE m.branch_id = branches.id AND m.organization_id = branches.organization_id AND m.user_id = auth.uid()));
CREATE POLICY role_tenant_read ON sanayipro.roles FOR SELECT TO sanayipro_runtime
USING ((sanayipro.selected_organization() IS NULL OR organization_id = sanayipro.selected_organization())
  AND EXISTS (SELECT 1 FROM sanayipro.organizations o WHERE o.id = roles.organization_id));
CREATE POLICY role_permission_tenant_read ON sanayipro.role_permissions FOR SELECT TO sanayipro_runtime
USING (EXISTS (SELECT 1 FROM sanayipro.roles r WHERE r.id = role_permissions.role_id AND r.organization_id = role_permissions.organization_id));
CREATE POLICY permission_authenticated_read ON sanayipro.permissions FOR SELECT TO sanayipro_runtime
USING (EXISTS (SELECT 1 FROM sanayipro.user_profiles p WHERE p.id = auth.uid()));

CREATE FUNCTION sanayipro.has_permission(required_code text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM sanayipro.branches b
    JOIN sanayipro.branch_memberships bm ON bm.branch_id = b.id AND bm.organization_id = b.organization_id AND bm.user_id = auth.uid()
    JOIN sanayipro.organization_memberships om ON om.organization_id = b.organization_id AND om.user_id = auth.uid()
    JOIN sanayipro.role_permissions rp ON rp.organization_id = b.organization_id AND (rp.role_id = bm.role_id OR rp.role_id = om.role_id)
    WHERE b.id = sanayipro.selected_branch()
      AND b.organization_id = sanayipro.selected_organization()
      AND rp.permission_code = required_code
  )
$$;

-- Owner must obey RLS too. Only the explicit maintenance role can provision.
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['organizations','branches','user_profiles','organization_memberships','branch_memberships','roles','permissions','role_permissions'] LOOP
    EXECUTE format('ALTER TABLE sanayipro.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE sanayipro.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY maintenance ON sanayipro.%I FOR ALL TO sanayipro_migrator USING (true) WITH CHECK (true)', table_name);
    EXECUTE format('REVOKE ALL ON sanayipro.%I FROM PUBLIC', table_name);
    EXECUTE format('GRANT SELECT ON sanayipro.%I TO sanayipro_runtime', table_name);
  END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA sanayipro FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sanayipro.selected_organization(), sanayipro.selected_branch(), sanayipro.has_permission(text) TO sanayipro_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA sanayipro REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA sanayipro REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
COMMIT;
