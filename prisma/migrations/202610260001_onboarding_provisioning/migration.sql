-- Additive migration. Connect ONLY as sanayipro_migrator.
-- Requires the sanayipro_onboarding login created by the updated prisma/bootstrap.sql.
-- Self-service sign-up needs INSERT, but sanayipro_runtime must stay read-only and
-- no SECURITY DEFINER / BYPASSRLS / service-role path may exist. A third, narrowly
-- scoped role may therefore create exactly ONE brand-new tenant for the verified
-- caller and nothing else: RLS WITH CHECK ties every row to auth.uid() and to an
-- organization created inside the SAME transaction.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'sanayipro_migrator' THEN
    RAISE EXCEPTION 'Migration requires the separate sanayipro_migrator login';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sanayipro_onboarding') THEN
    RAISE EXCEPTION 'Run the updated prisma/bootstrap.sql first (sanayipro_onboarding role missing)';
  END IF;
END $$;

-- SECURITY INVOKER only.
CREATE FUNCTION sanayipro.onboarding_organization() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT nullif(current_setting('app.onboarding_organization_id', true), '')::uuid
$$;
-- True only for rows written by the transaction that is evaluating the policy.
CREATE FUNCTION sanayipro.created_in_current_transaction(row_xmin xid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT row_xmin::text = (txid_current() % 4294967296)::text
$$;

GRANT INSERT ON sanayipro.user_profiles, sanayipro.organizations, sanayipro.branches,
  sanayipro.roles, sanayipro.role_permissions, sanayipro.organization_memberships,
  sanayipro.branch_memberships TO sanayipro_onboarding;
GRANT SELECT ON sanayipro.organizations, sanayipro.organization_memberships TO sanayipro_onboarding;
GRANT EXECUTE ON FUNCTION sanayipro.onboarding_organization(),
  sanayipro.created_in_current_transaction(xid) TO sanayipro_onboarding;
REVOKE ALL ON FUNCTION sanayipro.onboarding_organization(),
  sanayipro.created_in_current_transaction(xid) FROM PUBLIC;

-- Visibility: only the caller's own membership rows (one-tenant-per-signup guard) and
-- organizations created by this very transaction.
CREATE POLICY onboarding_membership_self_read ON sanayipro.organization_memberships
FOR SELECT TO sanayipro_onboarding USING (user_id = auth.uid());
CREATE POLICY onboarding_organization_tx_read ON sanayipro.organizations
FOR SELECT TO sanayipro_onboarding
USING (sanayipro.created_in_current_transaction(xmin));

CREATE POLICY onboarding_profile_insert ON sanayipro.user_profiles
FOR INSERT TO sanayipro_onboarding WITH CHECK (id = auth.uid());
CREATE POLICY onboarding_organization_insert ON sanayipro.organizations
FOR INSERT TO sanayipro_onboarding
WITH CHECK (id = sanayipro.onboarding_organization()
  AND NOT EXISTS (SELECT 1 FROM sanayipro.organization_memberships m WHERE m.user_id = auth.uid()));
CREATE POLICY onboarding_branch_insert ON sanayipro.branches
FOR INSERT TO sanayipro_onboarding
WITH CHECK (organization_id = sanayipro.onboarding_organization()
  AND EXISTS (SELECT 1 FROM sanayipro.organizations o WHERE o.id = organization_id));
CREATE POLICY onboarding_role_insert ON sanayipro.roles
FOR INSERT TO sanayipro_onboarding
WITH CHECK (organization_id = sanayipro.onboarding_organization() AND code = 'owner'
  AND EXISTS (SELECT 1 FROM sanayipro.organizations o WHERE o.id = organization_id));
CREATE POLICY onboarding_role_permission_insert ON sanayipro.role_permissions
FOR INSERT TO sanayipro_onboarding
WITH CHECK (organization_id = sanayipro.onboarding_organization()
  AND EXISTS (SELECT 1 FROM sanayipro.organizations o WHERE o.id = organization_id));
CREATE POLICY onboarding_organization_membership_insert ON sanayipro.organization_memberships
FOR INSERT TO sanayipro_onboarding
WITH CHECK (user_id = auth.uid() AND organization_id = sanayipro.onboarding_organization()
  AND EXISTS (SELECT 1 FROM sanayipro.organizations o WHERE o.id = organization_id));
CREATE POLICY onboarding_branch_membership_insert ON sanayipro.branch_memberships
FOR INSERT TO sanayipro_onboarding
WITH CHECK (user_id = auth.uid() AND organization_id = sanayipro.onboarding_organization()
  AND EXISTS (SELECT 1 FROM sanayipro.organizations o WHERE o.id = organization_id));
COMMIT;
