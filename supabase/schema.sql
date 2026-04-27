-- =====================================================
-- Golda Events CRM - Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES (extends auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sales')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SETTINGS (configurable by admin)
-- =====================================================
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.settings (key, value) VALUES
  ('profit_warning_threshold', '1000'),
  ('basketa_cost_nis', '150');

-- =====================================================
-- LOCATIONS
-- =====================================================
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_name TEXT NOT NULL UNIQUE,
  travel_cost_nis INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.locations (city_name, travel_cost_nis) VALUES
  ('תל אביב', 300),
  ('ירושלים', 400),
  ('חיפה', 400),
  ('באר שבע', 500),
  ('דימונה', 100),
  ('אשדוד', 250),
  ('אשקלון', 300),
  ('נתניה', 350),
  ('פתח תקווה', 300),
  ('ראשון לציון', 300),
  ('רחובות', 300),
  ('הרצליה', 320),
  ('רמת גן', 300),
  ('בני ברק', 300),
  ('ביתר עילית', 450),
  ('מודיעין', 380),
  ('אילת', 900);

-- =====================================================
-- FLAVORS
-- =====================================================
CREATE TABLE public.flavors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('dairy', 'parve')),
  is_in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEADS
-- =====================================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('institutional', 'private')),
  event_type TEXT NOT NULL CHECK (event_type IN ('dairy', 'parve')),
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  participants INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'quote_sent', 'closed', 'done', 'canceled')),
  sales_rep_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  -- Internal (admin only)
  manager_included BOOLEAN DEFAULT TRUE,
  assistants_count INTEGER DEFAULT 0,
  -- Pricing overrides (for private clients)
  price_override NUMERIC(10,2),
  price_per_person_override NUMERIC(10,2),
  -- Signature
  signature_token UUID DEFAULT uuid_generate_v4(),
  client_approved_at TIMESTAMPTZ,
  client_approved_name TEXT,
  -- Google Calendar
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEAD FLAVORS (junction table)
-- =====================================================
CREATE TABLE public.lead_flavors (
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  flavor_id UUID REFERENCES public.flavors(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, flavor_id)
);

-- =====================================================
-- QUOTES
-- =====================================================
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  base_price NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2),
  logistics_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  extras JSONB DEFAULT '[]',
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) DEFAULT 0,
  advance_paid NUMERIC(10,2) DEFAULT 0,
  balance_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: authenticated users see all, can update own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (get_my_role() = 'admin');

-- Settings: anyone authenticated reads, only admin writes
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.settings FOR ALL TO authenticated USING (get_my_role() = 'admin');

-- Locations: anyone reads, anyone adds (auto-saves to DB), admin deletes
CREATE POLICY "locations_select" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations_insert" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "locations_admin_write" ON public.locations FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "locations_admin_delete" ON public.locations FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- Flavors: anyone reads/toggles stock, only admin deletes/creates
CREATE POLICY "flavors_select" ON public.flavors FOR SELECT TO authenticated USING (true);
CREATE POLICY "flavors_insert" ON public.flavors FOR INSERT TO authenticated USING (get_my_role() = 'admin');
CREATE POLICY "flavors_toggle_stock" ON public.flavors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "flavors_admin_delete" ON public.flavors FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- Leads: all authenticated users see all leads (single sales rep use case)
CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "leads_admin_delete" ON public.leads FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- Lead flavors
CREATE POLICY "lead_flavors_select" ON public.lead_flavors FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_flavors_insert" ON public.lead_flavors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lead_flavors_delete" ON public.lead_flavors FOR DELETE TO authenticated USING (true);

-- Quotes: all authenticated see, all can write
CREATE POLICY "quotes_select" ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_leads_event_date ON public.leads(event_date);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_sales_rep ON public.leads(sales_rep_id);
CREATE INDEX idx_flavors_category ON public.flavors(category);
CREATE INDEX idx_flavors_in_stock ON public.flavors(is_in_stock);
CREATE INDEX idx_lead_flavors_lead ON public.lead_flavors(lead_id);

-- =====================================================
-- UPDATED_AT trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
