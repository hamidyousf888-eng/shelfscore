
-- ========== helpers ==========
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ========== profiles ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_super_admin(_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _uid AND p.is_super_admin) $$;

CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ========== plans ==========
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  per_user_price_cents INTEGER NOT NULL DEFAULT 0,
  per_register_price_cents INTEGER NOT NULL DEFAULT 0,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  trial_days INTEGER NOT NULL DEFAULT 14,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans admin write" ON public.plans FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);
GRANT SELECT ON public.plan_features TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_features TO authenticated;
GRANT ALL ON public.plan_features TO service_role;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan features read" ON public.plan_features FOR SELECT USING (true);
CREATE POLICY "plan features admin write" ON public.plan_features FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ========== companies ==========
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  legal_name TEXT,
  logo_url TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  country TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  locale TEXT NOT NULL DEFAULT 'en',
  tax_inclusive_pricing BOOLEAN NOT NULL DEFAULT false,
  default_tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  business_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  receipt_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  numbering_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== roles / permissions / memberships ==========
CREATE TABLE public.permissions (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions read" ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (user_id, company_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_company ON public.memberships(company_id);

CREATE OR REPLACE FUNCTION public.is_company_member(_company UUID, _uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = _company AND m.user_id = _uid AND m.status = 'active') $$;

CREATE OR REPLACE FUNCTION public.has_permission(_company UUID, _permission TEXT, _uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.role_permissions rp ON rp.role_id = m.role_id
    WHERE m.company_id = _company AND m.user_id = _uid AND m.status = 'active'
      AND (rp.permission_key = _permission OR rp.permission_key = '*')) $$;

CREATE POLICY "companies member read" ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(id));
CREATE POLICY "companies insert" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "companies update" ON public.companies FOR UPDATE TO authenticated
  USING (public.has_permission(id, 'company.manage')) WITH CHECK (public.has_permission(id, 'company.manage'));
CREATE POLICY "companies delete" ON public.companies FOR DELETE TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "roles read" ON public.roles FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.is_company_member(company_id));
CREATE POLICY "roles write" ON public.roles FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_permission(company_id, 'staff.manage'))
  WITH CHECK (company_id IS NOT NULL AND public.has_permission(company_id, 'staff.manage'));

CREATE POLICY "role permissions read" ON public.role_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id
    AND (r.company_id IS NULL OR public.is_company_member(r.company_id))));
CREATE POLICY "role permissions write" ON public.role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.company_id IS NOT NULL
    AND public.has_permission(r.company_id, 'staff.manage')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.company_id IS NOT NULL
    AND public.has_permission(r.company_id, 'staff.manage')));

CREATE POLICY "memberships read" ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_member(company_id));
CREATE POLICY "memberships write" ON public.memberships FOR ALL TO authenticated
  USING (public.has_permission(company_id, 'staff.manage'))
  WITH CHECK (public.has_permission(company_id, 'staff.manage'));

-- ========== franchise groups / stores / registers ==========
CREATE TABLE public.franchise_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.franchise_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_groups TO authenticated;
GRANT ALL ON public.franchise_groups TO service_role;
ALTER TABLE public.franchise_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fg read" ON public.franchise_groups FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "fg write" ON public.franchise_groups FOR ALL TO authenticated
  USING (public.has_permission(company_id, 'company.manage')) WITH CHECK (public.has_permission(company_id, 'company.manage'));

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  franchise_group_id UUID REFERENCES public.franchise_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT,
  currency TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stores_company ON public.stores(company_id);
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "stores read" ON public.stores FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "stores write" ON public.stores FOR ALL TO authenticated
  USING (public.has_permission(company_id, 'store.manage')) WITH CHECK (public.has_permission(company_id, 'store.manage'));

CREATE TABLE public.registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  device_type TEXT NOT NULL DEFAULT 'register',
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  active_user_id UUID,
  hardware JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registers TO authenticated;
GRANT ALL ON public.registers TO service_role;
ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_registers_updated BEFORE UPDATE ON public.registers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "registers read" ON public.registers FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "registers write" ON public.registers FOR ALL TO authenticated
  USING (public.has_permission(company_id, 'device.manage')) WITH CHECK (public.has_permission(company_id, 'device.manage'));

-- ========== subscriptions ==========
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'trial',
  billing_model TEXT NOT NULL DEFAULT 'platform_fee',
  seats INTEGER NOT NULL DEFAULT 1,
  register_count INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'USD',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  grace_days INTEGER NOT NULL DEFAULT 7,
  alert_lead_days INTEGER NOT NULL DEFAULT 14,
  fixed_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_alert_enabled BOOLEAN NOT NULL DEFAULT false,
  custom_alert_message TEXT,
  alert_channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_ref TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "subs read" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "subs admin write" ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'open',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_invoices TO authenticated;
GRANT ALL ON public.subscription_invoices TO service_role;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub invoices read" ON public.subscription_invoices FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "sub invoices admin write" ON public.subscription_invoices FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.usage_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT current_date,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, metric, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_meters TO authenticated;
GRANT ALL ON public.usage_meters TO service_role;
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage read" ON public.usage_meters FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "usage admin write" ON public.usage_meters FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ========== feature flags ==========
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'company',
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  register_id UUID REFERENCES public.registers(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
CREATE UNIQUE INDEX idx_ff_unique ON public.feature_flags
  (company_id, feature_key, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(register_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ff_updated BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "ff read" ON public.feature_flags FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "ff write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_permission(company_id, 'features.manage')) WITH CHECK (public.has_permission(company_id, 'features.manage'));

-- ========== notifications / audit / invites ==========
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_company ON public.notifications(company_id, created_at DESC);
CREATE POLICY "notifications read" ON public.notifications FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR (company_id IS NOT NULL AND public.is_company_member(company_id)));
CREATE POLICY "notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR (company_id IS NOT NULL AND public.is_company_member(company_id)))
  WITH CHECK ((user_id = auth.uid()) OR (company_id IS NOT NULL AND public.is_company_member(company_id)));
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (company_id IS NULL OR public.is_company_member(company_id));

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID,
  user_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_company ON public.audit_logs(company_id, created_at DESC);
CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.has_permission(company_id, 'audit.read'));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (company_id IS NULL OR public.is_company_member(company_id));

CREATE TABLE public.company_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invites TO authenticated;
GRANT ALL ON public.company_invites TO service_role;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites read" ON public.company_invites FOR SELECT TO authenticated
  USING (public.is_company_member(company_id) OR lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));
CREATE POLICY "invites write" ON public.company_invites FOR ALL TO authenticated
  USING (public.has_permission(company_id, 'staff.manage')) WITH CHECK (public.has_permission(company_id, 'staff.manage'));

-- ========== permission catalog ==========
INSERT INTO public.permissions (key, category, description) VALUES
  ('*','platform','Full access'),
  ('company.manage','company','Manage company settings'),
  ('store.manage','company','Manage stores'),
  ('device.manage','company','Manage devices and registers'),
  ('features.manage','company','Manage feature toggles'),
  ('staff.manage','staff','Manage staff, roles and invites'),
  ('audit.read','security','View audit log'),
  ('reports.read','reports','View reports and dashboards'),
  ('pos.operate','pos','Operate the point of sale'),
  ('pos.void','pos','Void transactions'),
  ('pos.refund','pos','Process refunds and returns'),
  ('pos.discount','pos','Apply discounts and price overrides'),
  ('pos.approve','pos','Approve sensitive cashier actions'),
  ('product.read','catalog','View products'),
  ('product.manage','catalog','Manage products and pricing'),
  ('inventory.read','inventory','View inventory'),
  ('inventory.manage','inventory','Adjust and transfer inventory'),
  ('purchasing.manage','purchasing','Manage suppliers and purchase orders'),
  ('customer.manage','customers','Manage customers and loyalty'),
  ('orders.manage','commerce','Manage online orders'),
  ('delivery.manage','commerce','Manage delivery and routes'),
  ('kitchen.operate','commerce','Operate kitchen display'),
  ('marketing.manage','marketing','Manage campaigns'),
  ('finance.manage','finance','Manage expenses, taxes and finance'),
  ('subscription.manage','billing','Manage the subscription');

-- ========== company bootstrap function ==========
CREATE OR REPLACE FUNCTION public.provision_company_roles(_company UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; rid UUID;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('owner','Company Owner', ARRAY['*']),
    ('admin','Company Admin', ARRAY['company.manage','store.manage','device.manage','features.manage','staff.manage','audit.read','reports.read','pos.operate','pos.void','pos.refund','pos.discount','pos.approve','product.read','product.manage','inventory.read','inventory.manage','purchasing.manage','customer.manage','orders.manage','delivery.manage','marketing.manage','finance.manage','subscription.manage']),
    ('store_manager','Store Manager', ARRAY['reports.read','staff.manage','pos.operate','pos.void','pos.refund','pos.discount','pos.approve','product.read','product.manage','inventory.read','inventory.manage','purchasing.manage','customer.manage','orders.manage','delivery.manage','device.manage']),
    ('cashier','Cashier', ARRAY['pos.operate','product.read','inventory.read','customer.manage']),
    ('purchasing','Purchasing Staff', ARRAY['purchasing.manage','product.read','inventory.read','inventory.manage','reports.read']),
    ('fulfillment','Fulfillment / Warehouse', ARRAY['inventory.read','inventory.manage','orders.manage','product.read']),
    ('driver','Delivery Driver', ARRAY['delivery.manage','orders.manage']),
    ('kitchen','Kitchen Staff', ARRAY['kitchen.operate','orders.manage']),
    ('marketing','Marketing Staff', ARRAY['marketing.manage','customer.manage','reports.read']),
    ('accountant','Accountant / Finance', ARRAY['finance.manage','reports.read','audit.read']),
    ('customer','Customer', ARRAY[]::text[]),
    ('supplier','Supplier Portal User', ARRAY['purchasing.manage'])
  ) AS t(key, name, perms)
  LOOP
    INSERT INTO public.roles (company_id, key, name, is_system)
    VALUES (_company, r.key, r.name, true)
    ON CONFLICT (company_id, key) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO rid;
    INSERT INTO public.role_permissions (role_id, permission_key)
    SELECT rid, unnest(r.perms) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.provision_company_roles(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.provision_company_roles(UUID) TO authenticated, service_role;
