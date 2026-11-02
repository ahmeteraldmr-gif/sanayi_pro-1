-- Additive operational schema migration. Connect ONLY as sanayipro_migrator.
-- Adds operational workshop tables, composite tenant foreign keys, check constraints,
-- operational permissions, and strict RLS policies for SELECT, INSERT, UPDATE, DELETE.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'sanayipro_migrator' THEN
    RAISE EXCEPTION 'Migration requires the separate sanayipro_migrator login';
  END IF;
END $$;

CREATE TABLE sanayipro.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES sanayipro.user_profiles(id) ON DELETE RESTRICT,
  email text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  granted_at timestamptz(3) NOT NULL DEFAULT now()
);

CREATE TABLE sanayipro.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES sanayipro.organizations(id) ON DELETE RESTRICT,
  branch_id uuid,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) > 0),
  phone text NOT NULL CHECK (char_length(btrim(phone)) > 0),
  normalized_phone text NOT NULL CHECK (char_length(btrim(normalized_phone)) > 0),
  email text,
  tax_number text,
  address text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id)
);
CREATE INDEX customers_organization_id_normalized_phone_idx ON sanayipro.customers(organization_id, normalized_phone);
CREATE INDEX customers_organization_id_full_name_idx ON sanayipro.customers(organization_id, full_name);

CREATE TABLE sanayipro.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES sanayipro.organizations(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL,
  plate text NOT NULL CHECK (char_length(btrim(plate)) > 0),
  normalized_plate text NOT NULL CHECK (char_length(btrim(normalized_plate)) > 0),
  brand text NOT NULL CHECK (char_length(btrim(brand)) > 0),
  model text NOT NULL CHECK (char_length(btrim(model)) > 0),
  year integer CHECK (year IS NULL OR (year >= 1950 AND year <= 2100)),
  vin text,
  engine_code text,
  fuel_type text,
  transmission text,
  kilometer integer NOT NULL DEFAULT 0 CHECK (kilometer >= 0),
  color text,
  active boolean NOT NULL DEFAULT true,
  last_service_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, normalized_plate),
  FOREIGN KEY (customer_id, organization_id) REFERENCES sanayipro.customers(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX vehicles_organization_id_customer_id_idx ON sanayipro.vehicles(organization_id, customer_id);

CREATE TABLE sanayipro.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) > 0),
  role_title text NOT NULL DEFAULT 'Teknisyen',
  specialty text,
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (id, organization_id, branch_id),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX staff_members_organization_id_branch_id_idx ON sanayipro.staff_members(organization_id, branch_id);

CREATE TABLE sanayipro.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  order_number text NOT NULL CHECK (char_length(btrim(order_number)) > 0),
  customer_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  primary_technician_id uuid,
  status text NOT NULL DEFAULT 'RECEIVED',
  approval_status text NOT NULL DEFAULT 'NOT_SENT',
  complaint text NOT NULL CHECK (char_length(btrim(complaint)) > 0),
  diagnosis text NOT NULL DEFAULT '',
  intake_kilometer integer CHECK (intake_kilometer IS NULL OR intake_kilometer >= 0),
  fuel_level integer CHECK (fuel_level IS NULL OR (fuel_level >= 0 AND fuel_level <= 100)),
  intake_checklist_json jsonb,
  labor_total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (labor_total >= 0),
  parts_total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (parts_total >= 0),
  discount_total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  tax_rate numeric(5, 2) NOT NULL DEFAULT 20 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  grand_total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  paid_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_at timestamptz(3),
  completed_at timestamptz(3),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (id, organization_id, branch_id),
  UNIQUE (organization_id, order_number),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id, organization_id) REFERENCES sanayipro.customers(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id, organization_id) REFERENCES sanayipro.vehicles(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX work_orders_organization_id_branch_id_status_idx ON sanayipro.work_orders(organization_id, branch_id, status);
CREATE INDEX work_orders_organization_id_vehicle_id_idx ON sanayipro.work_orders(organization_id, vehicle_id);

CREATE TABLE sanayipro.work_order_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  actor_user_id uuid,
  actor_name text NOT NULL,
  event_type text NOT NULL DEFAULT 'STATUS',
  description text NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX work_order_timelines_organization_id_work_order_id_created_at_idx ON sanayipro.work_order_timelines(organization_id, work_order_id, created_at);

CREATE TABLE sanayipro.work_order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  author_user_id uuid,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'Usta',
  content text NOT NULL CHECK (char_length(btrim(content)) > 0),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX work_order_notes_organization_id_work_order_id_created_at_idx ON sanayipro.work_order_notes(organization_id, work_order_id, created_at);

CREATE TABLE sanayipro.technician_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  staff_member_id uuid NOT NULL,
  assigned_by_user_id uuid,
  role_in_order text NOT NULL DEFAULT 'PRIMARY',
  active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz(3) NOT NULL DEFAULT now(),
  unassigned_at timestamptz(3),
  UNIQUE (work_order_id, staff_member_id),
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (staff_member_id, organization_id, branch_id) REFERENCES sanayipro.staff_members(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX technician_assignments_organization_id_branch_id_staff_member_id_idx ON sanayipro.technician_assignments(organization_id, branch_id, staff_member_id);

CREATE TABLE sanayipro.work_order_labor_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  hours numeric(8, 2) NOT NULL DEFAULT 1 CHECK (hours > 0),
  hourly_rate numeric(12, 2) NOT NULL CHECK (hourly_rate >= 0),
  total_price numeric(12, 2) NOT NULL CHECK (total_price >= 0),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX work_order_labor_items_organization_id_work_order_id_idx ON sanayipro.work_order_labor_items(organization_id, work_order_id);

CREATE TABLE sanayipro.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES sanayipro.organizations(id) ON DELETE RESTRICT,
  branch_id uuid,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  contact_name text,
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id)
);
CREATE INDEX suppliers_organization_id_idx ON sanayipro.suppliers(organization_id);

CREATE TABLE sanayipro.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  supplier_id uuid,
  sku text NOT NULL CHECK (char_length(btrim(sku)) > 0),
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  stock_qty integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  reserved_qty integer NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  min_stock_qty integer NOT NULL DEFAULT 0 CHECK (min_stock_qty >= 0),
  unit_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  unit_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, branch_id),
  UNIQUE (organization_id, branch_id, sku),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id, organization_id) REFERENCES sanayipro.suppliers(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX inventory_items_organization_id_branch_id_idx ON sanayipro.inventory_items(organization_id, branch_id);

CREATE TABLE sanayipro.work_order_part_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  inventory_item_id uuid,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  sku text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_price numeric(12, 2) NOT NULL CHECK (total_price >= 0),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (inventory_item_id, organization_id, branch_id) REFERENCES sanayipro.inventory_items(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX work_order_part_items_organization_id_work_order_id_idx ON sanayipro.work_order_part_items(organization_id, work_order_id);

CREATE TABLE sanayipro.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  customer_id uuid,
  vehicle_id uuid NOT NULL,
  staff_member_id uuid,
  starts_at timestamptz(3) NOT NULL,
  ends_at timestamptz(3) NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes >= 15 AND duration_minutes <= 720),
  status text NOT NULL DEFAULT 'Planlandı',
  service_note text NOT NULL CHECK (char_length(btrim(service_note)) > 0),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id, organization_id) REFERENCES sanayipro.customers(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id, organization_id) REFERENCES sanayipro.vehicles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (staff_member_id, organization_id, branch_id) REFERENCES sanayipro.staff_members(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX appointments_organization_id_branch_id_starts_at_idx ON sanayipro.appointments(organization_id, branch_id, starts_at);

CREATE TABLE sanayipro.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  work_order_id uuid,
  actor_user_id uuid,
  movement_type text NOT NULL,
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  unit_cost numeric(12, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  note text NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (inventory_item_id, organization_id, branch_id) REFERENCES sanayipro.inventory_items(id, organization_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX inventory_movements_organization_id_branch_id_inventory_item_id_idx ON sanayipro.inventory_movements(organization_id, branch_id, inventory_item_id, created_at);

CREATE TABLE sanayipro.part_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  inventory_item_id uuid,
  part_name text NOT NULL CHECK (char_length(btrim(part_name)) > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  requested_by text NOT NULL,
  status text NOT NULL DEFAULT 'REQUESTED',
  note text,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (inventory_item_id, organization_id, branch_id) REFERENCES sanayipro.inventory_items(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX part_requests_organization_id_branch_id_work_order_id_idx ON sanayipro.part_requests(organization_id, branch_id, work_order_id);

CREATE TABLE sanayipro.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid,
  customer_id uuid,
  vehicle_id uuid,
  quote_number text NOT NULL CHECK (char_length(btrim(quote_number)) > 0),
  status text NOT NULL DEFAULT 'DRAFT',
  subtotal_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  valid_until timestamptz(3),
  notes text,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, quote_number),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id, organization_id) REFERENCES sanayipro.customers(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id, organization_id) REFERENCES sanayipro.vehicles(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX quotes_organization_id_branch_id_idx ON sanayipro.quotes(organization_id, branch_id);

CREATE TABLE sanayipro.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  quote_id uuid NOT NULL,
  item_type text NOT NULL DEFAULT 'PART',
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  quantity numeric(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(12, 2) NOT NULL CHECK (total_price >= 0),
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (quote_id, organization_id) REFERENCES sanayipro.quotes(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX quote_items_organization_id_quote_id_idx ON sanayipro.quote_items(organization_id, quote_id);

CREATE TABLE sanayipro.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  customer_id uuid,
  recorded_by_user_id uuid,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'CASH',
  reference_no text,
  note text,
  paid_at timestamptz(3) NOT NULL DEFAULT now(),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id, organization_id) REFERENCES sanayipro.customers(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX payments_organization_id_branch_id_work_order_id_idx ON sanayipro.payments(organization_id, branch_id, work_order_id);
CREATE INDEX payments_organization_id_paid_at_idx ON sanayipro.payments(organization_id, paid_at);

CREATE TABLE sanayipro.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  work_order_id uuid,
  recorded_by_user_id uuid,
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  kind text NOT NULL DEFAULT 'expense',
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  incurred_at timestamptz(3) NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT
);
CREATE INDEX expenses_organization_id_branch_id_incurred_at_idx ON sanayipro.expenses(organization_id, branch_id, incurred_at);

CREATE TABLE sanayipro.fault_code_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid,
  vehicle_id uuid,
  dtc_code text NOT NULL CHECK (char_length(btrim(dtc_code)) > 0),
  vehicle_plate text,
  vehicle_model text,
  technician_notes text,
  queried_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id, organization_id) REFERENCES sanayipro.vehicles(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX fault_code_searches_organization_id_branch_id_queried_at_idx ON sanayipro.fault_code_searches(organization_id, branch_id, queried_at);

CREATE TABLE sanayipro.vehicle_fault_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  work_order_id uuid,
  fault_search_id uuid,
  dtc_code text NOT NULL CHECK (char_length(btrim(dtc_code)) > 0),
  title_tr text NOT NULL,
  checklist_json jsonb,
  status text NOT NULL DEFAULT 'OPEN',
  technician_notes text,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  resolved_at timestamptz(3),
  FOREIGN KEY (branch_id, organization_id) REFERENCES sanayipro.branches(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id, organization_id) REFERENCES sanayipro.vehicles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (work_order_id, organization_id, branch_id) REFERENCES sanayipro.work_orders(id, organization_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (fault_search_id, organization_id) REFERENCES sanayipro.fault_code_searches(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX vehicle_fault_records_organization_id_vehicle_id_idx ON sanayipro.vehicle_fault_records(organization_id, vehicle_id);
CREATE INDEX vehicle_fault_records_organization_id_work_order_id_idx ON sanayipro.vehicle_fault_records(organization_id, work_order_id);

-- Seed operational permissions (idempotent).
INSERT INTO sanayipro.permissions(code, name) VALUES
  ('customers.read', 'Müşteri kayıtlarını görüntüleme'),
  ('customers.write', 'Müşteri oluşturma ve güncelleme'),
  ('vehicles.read', 'Araç kayıtlarını görüntüleme'),
  ('vehicles.write', 'Araç oluşturma ve güncelleme'),
  ('work_orders.read', 'İş emirlerini görüntüleme'),
  ('work_orders.write', 'İş emri oluşturma, not ve durum güncelleme'),
  ('work_orders.assign', 'İş emirlerine teknisyen/usta atama'),
  ('appointments.read', 'Randevu takvimini görüntüleme'),
  ('appointments.write', 'Randevu oluşturma ve taşıma'),
  ('inventory.read', 'Stok ve parça taleplerini görüntüleme'),
  ('inventory.write', 'Stok girişi, çıkışı ve parça kullanımı'),
  ('finance.read', 'Kasa, tahsilat ve giderleri görüntüleme'),
  ('finance.write', 'Tahsilat, teklif ve gider kaydı oluşturma'),
  ('faults.read', 'Arıza kodu geçmişini görüntüleme'),
  ('faults.write', 'Arıza kodu araması ve araç arıza kaydı oluşturma'),
  ('team.read', 'Ekip ve personel listesini görüntüleme'),
  ('team.write', 'Personel ekleme ve düzenleme'),
  ('platform.super_admin', 'Platform süper yönetici erişimi')
ON CONFLICT (code) DO NOTHING;

-- SECURITY INVOKER only: evaluates permission via the caller's active branch/organization membership.
-- Organization owners (code = 'owner' with 'app.access') hold all tenant operational permissions
-- within their own selected organization and branch, while non-owner roles require explicit grants.
CREATE OR REPLACE FUNCTION sanayipro.has_permission(required_code text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM sanayipro.branches b
    JOIN sanayipro.branch_memberships bm ON bm.branch_id = b.id AND bm.organization_id = b.organization_id AND bm.user_id = auth.uid() AND bm.active
    JOIN sanayipro.organization_memberships om ON om.organization_id = b.organization_id AND om.user_id = auth.uid() AND om.active
    JOIN sanayipro.roles r ON r.organization_id = b.organization_id AND (r.id = bm.role_id OR r.id = om.role_id)
    JOIN sanayipro.role_permissions rp ON rp.organization_id = b.organization_id AND rp.role_id = r.id
    WHERE b.id = sanayipro.selected_branch()
      AND b.organization_id = sanayipro.selected_organization()
      AND (
        rp.permission_code = required_code
        OR (r.code = 'owner' AND rp.permission_code = 'app.access' AND required_code <> 'platform.super_admin')
      )
  )
$$;

-- SECURITY INVOKER helper for platform admin check.
CREATE OR REPLACE FUNCTION sanayipro.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM sanayipro.platform_admins pa
    WHERE pa.user_id = auth.uid() AND pa.active
  )
$$;

-- Enable & Force RLS on platform_admins (read-only self-check for runtime, full for migrator).
ALTER TABLE sanayipro.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanayipro.platform_admins FORCE ROW LEVEL SECURITY;
CREATE POLICY maintenance ON sanayipro.platform_admins FOR ALL TO sanayipro_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON sanayipro.platform_admins FROM PUBLIC;
GRANT SELECT ON sanayipro.platform_admins TO sanayipro_runtime;
CREATE POLICY platform_admin_self_read ON sanayipro.platform_admins FOR SELECT TO sanayipro_runtime
USING (user_id = auth.uid() AND active);

-- Enable & Force RLS + grant runtime CRUD on all 20 operational tables.
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customers',
    'vehicles',
    'staff_members',
    'work_orders',
    'work_order_timelines',
    'work_order_notes',
    'technician_assignments',
    'work_order_labor_items',
    'work_order_part_items',
    'appointments',
    'suppliers',
    'inventory_items',
    'inventory_movements',
    'part_requests',
    'quotes',
    'quote_items',
    'payments',
    'expenses',
    'fault_code_searches',
    'vehicle_fault_records'
  ] LOOP
    EXECUTE format('ALTER TABLE sanayipro.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE sanayipro.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY maintenance ON sanayipro.%I FOR ALL TO sanayipro_migrator USING (true) WITH CHECK (true)', table_name);
    EXECUTE format('REVOKE ALL ON sanayipro.%I FROM PUBLIC', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON sanayipro.%I TO sanayipro_runtime', table_name);
  END LOOP;
END $$;

-- 1. customers (organization-scoped, optional branch_id)
CREATE POLICY customers_select ON sanayipro.customers FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('customers.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY customers_insert ON sanayipro.customers FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND (branch_id IS NULL OR branch_id = sanayipro.selected_branch())
  AND sanayipro.has_permission('customers.write'));
CREATE POLICY customers_update ON sanayipro.customers FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('customers.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND (branch_id IS NULL OR branch_id = sanayipro.selected_branch())
  AND sanayipro.has_permission('customers.write'));
CREATE POLICY customers_delete ON sanayipro.customers FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('customers.write'));

-- 2. vehicles (organization-scoped)
CREATE POLICY vehicles_select ON sanayipro.vehicles FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('vehicles.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY vehicles_insert ON sanayipro.vehicles FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('vehicles.write'));
CREATE POLICY vehicles_update ON sanayipro.vehicles FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('vehicles.write'))
WITH CHECK (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('vehicles.write'));
CREATE POLICY vehicles_delete ON sanayipro.vehicles FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('vehicles.write'));

-- 3. staff_members (branch-scoped)
CREATE POLICY staff_members_select ON sanayipro.staff_members FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('team.read') OR sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY staff_members_insert ON sanayipro.staff_members FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('team.write'));
CREATE POLICY staff_members_update ON sanayipro.staff_members FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('team.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('team.write'));
CREATE POLICY staff_members_delete ON sanayipro.staff_members FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('team.write'));

-- 4. work_orders (branch-scoped)
CREATE POLICY work_orders_select ON sanayipro.work_orders FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY work_orders_insert ON sanayipro.work_orders FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));
CREATE POLICY work_orders_update ON sanayipro.work_orders FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.write') OR sanayipro.has_permission('work_orders.assign') OR sanayipro.has_permission('inventory.write') OR sanayipro.has_permission('finance.write')))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.write') OR sanayipro.has_permission('work_orders.assign') OR sanayipro.has_permission('inventory.write') OR sanayipro.has_permission('finance.write')));
CREATE POLICY work_orders_delete ON sanayipro.work_orders FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));

-- 5. work_order_timelines (branch-scoped)
CREATE POLICY work_order_timelines_select ON sanayipro.work_order_timelines FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY work_order_timelines_insert ON sanayipro.work_order_timelines FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.write') OR sanayipro.has_permission('work_orders.assign') OR sanayipro.has_permission('inventory.write') OR sanayipro.has_permission('finance.write') OR sanayipro.has_permission('faults.write')));
CREATE POLICY work_order_timelines_update ON sanayipro.work_order_timelines FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));
CREATE POLICY work_order_timelines_delete ON sanayipro.work_order_timelines FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));

-- 6. work_order_notes (branch-scoped)
CREATE POLICY work_order_notes_select ON sanayipro.work_order_notes FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY work_order_notes_insert ON sanayipro.work_order_notes FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));
CREATE POLICY work_order_notes_update ON sanayipro.work_order_notes FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));
CREATE POLICY work_order_notes_delete ON sanayipro.work_order_notes FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));

-- 7. technician_assignments (branch-scoped, requires work_orders.assign)
CREATE POLICY technician_assignments_select ON sanayipro.technician_assignments FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY technician_assignments_insert ON sanayipro.technician_assignments FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.assign'));
CREATE POLICY technician_assignments_update ON sanayipro.technician_assignments FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.assign'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.assign'));
CREATE POLICY technician_assignments_delete ON sanayipro.technician_assignments FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.assign'));

-- 8. work_order_labor_items (branch-scoped)
CREATE POLICY work_order_labor_items_select ON sanayipro.work_order_labor_items FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY work_order_labor_items_insert ON sanayipro.work_order_labor_items FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));
CREATE POLICY work_order_labor_items_update ON sanayipro.work_order_labor_items FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));
CREATE POLICY work_order_labor_items_delete ON sanayipro.work_order_labor_items FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('work_orders.write'));

-- 9. work_order_part_items (branch-scoped)
CREATE POLICY work_order_part_items_select ON sanayipro.work_order_part_items FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('inventory.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY work_order_part_items_insert ON sanayipro.work_order_part_items FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.write') OR sanayipro.has_permission('inventory.write')));
CREATE POLICY work_order_part_items_update ON sanayipro.work_order_part_items FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.write') OR sanayipro.has_permission('inventory.write')))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.write') OR sanayipro.has_permission('inventory.write')));
CREATE POLICY work_order_part_items_delete ON sanayipro.work_order_part_items FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('work_orders.write') OR sanayipro.has_permission('inventory.write')));

-- 10. appointments (branch-scoped)
CREATE POLICY appointments_select ON sanayipro.appointments FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('appointments.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY appointments_insert ON sanayipro.appointments FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('appointments.write'));
CREATE POLICY appointments_update ON sanayipro.appointments FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('appointments.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('appointments.write'));
CREATE POLICY appointments_delete ON sanayipro.appointments FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('appointments.write'));

-- 11. suppliers (organization-scoped)
CREATE POLICY suppliers_select ON sanayipro.suppliers FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('inventory.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY suppliers_insert ON sanayipro.suppliers FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND (branch_id IS NULL OR branch_id = sanayipro.selected_branch())
  AND sanayipro.has_permission('inventory.write'));
CREATE POLICY suppliers_update ON sanayipro.suppliers FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('inventory.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND (branch_id IS NULL OR branch_id = sanayipro.selected_branch())
  AND sanayipro.has_permission('inventory.write'));
CREATE POLICY suppliers_delete ON sanayipro.suppliers FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization() AND sanayipro.has_permission('inventory.write'));

-- 12. inventory_items (branch-scoped)
CREATE POLICY inventory_items_select ON sanayipro.inventory_items FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('inventory.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY inventory_items_insert ON sanayipro.inventory_items FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'));
CREATE POLICY inventory_items_update ON sanayipro.inventory_items FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'));
CREATE POLICY inventory_items_delete ON sanayipro.inventory_items FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'));

-- 13. inventory_movements (branch-scoped)
CREATE POLICY inventory_movements_select ON sanayipro.inventory_movements FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('inventory.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY inventory_movements_insert ON sanayipro.inventory_movements FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'));
CREATE POLICY inventory_movements_update ON sanayipro.inventory_movements FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'));
CREATE POLICY inventory_movements_delete ON sanayipro.inventory_movements FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('inventory.write'));

-- 14. part_requests (branch-scoped)
CREATE POLICY part_requests_select ON sanayipro.part_requests FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('inventory.read') OR sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY part_requests_insert ON sanayipro.part_requests FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('inventory.write') OR sanayipro.has_permission('work_orders.write')));
CREATE POLICY part_requests_update ON sanayipro.part_requests FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('inventory.write') OR sanayipro.has_permission('work_orders.write')))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('inventory.write') OR sanayipro.has_permission('work_orders.write')));
CREATE POLICY part_requests_delete ON sanayipro.part_requests FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('inventory.write') OR sanayipro.has_permission('work_orders.write')));

-- 15. quotes (branch-scoped)
CREATE POLICY quotes_select ON sanayipro.quotes FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('finance.read') OR sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY quotes_insert ON sanayipro.quotes FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')));
CREATE POLICY quotes_update ON sanayipro.quotes FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')));
CREATE POLICY quotes_delete ON sanayipro.quotes FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')));

-- 16. quote_items (organization-scoped via quote)
CREATE POLICY quote_items_select ON sanayipro.quote_items FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('finance.read') OR sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY quote_items_insert ON sanayipro.quote_items FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')));
CREATE POLICY quote_items_update ON sanayipro.quote_items FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')));
CREATE POLICY quote_items_delete ON sanayipro.quote_items FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND (sanayipro.has_permission('finance.write') OR sanayipro.has_permission('work_orders.write')));

-- 17. payments (branch-scoped)
CREATE POLICY payments_select ON sanayipro.payments FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('finance.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY payments_insert ON sanayipro.payments FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'));
CREATE POLICY payments_update ON sanayipro.payments FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'));
CREATE POLICY payments_delete ON sanayipro.payments FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'));

-- 18. expenses (branch-scoped)
CREATE POLICY expenses_select ON sanayipro.expenses FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('finance.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY expenses_insert ON sanayipro.expenses FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'));
CREATE POLICY expenses_update ON sanayipro.expenses FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'));
CREATE POLICY expenses_delete ON sanayipro.expenses FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('finance.write'));

-- 19. fault_code_searches (branch-scoped)
CREATE POLICY fault_code_searches_select ON sanayipro.fault_code_searches FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('faults.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY fault_code_searches_insert ON sanayipro.fault_code_searches FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'));
CREATE POLICY fault_code_searches_update ON sanayipro.fault_code_searches FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'));
CREATE POLICY fault_code_searches_delete ON sanayipro.fault_code_searches FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'));

-- 20. vehicle_fault_records (branch-scoped)
CREATE POLICY vehicle_fault_records_select ON sanayipro.vehicle_fault_records FOR SELECT TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND (sanayipro.has_permission('faults.read') OR sanayipro.has_permission('work_orders.read') OR sanayipro.has_permission('tenant.read')));
CREATE POLICY vehicle_fault_records_insert ON sanayipro.vehicle_fault_records FOR INSERT TO sanayipro_runtime
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'));
CREATE POLICY vehicle_fault_records_update ON sanayipro.vehicle_fault_records FOR UPDATE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'))
WITH CHECK (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'));
CREATE POLICY vehicle_fault_records_delete ON sanayipro.vehicle_fault_records FOR DELETE TO sanayipro_runtime
USING (organization_id = sanayipro.selected_organization()
  AND branch_id = sanayipro.selected_branch()
  AND sanayipro.has_permission('faults.write'));

REVOKE ALL ON FUNCTION sanayipro.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sanayipro.has_permission(text), sanayipro.is_platform_admin() TO sanayipro_runtime;
COMMIT;
