-- Diamond CRM - Supabase Schema
-- Run this in the Supabase SQL Editor after creating your project

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'freelancer' CHECK (role IN ('admin', 'freelancer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKUs (your 6 product variants)
CREATE TABLE skus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  carat_size TEXT NOT NULL CHECK (carat_size IN ('Small', 'Medium', 'Large')),
  gold_type TEXT NOT NULL CHECK (gold_type IN ('White', 'Yellow')),
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  flat_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (stores and freelancer-buyers, NOT individuals)
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('store', 'freelancer')),
  contact_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manufacturers
CREATE TABLE manufacturers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consignments (stock assigned to freelancers)
CREATE TABLE consignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  freelancer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sku_id UUID REFERENCES skus(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  freelancer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sku_id UUID REFERENCES skus(id) ON DELETE SET NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('store', 'freelancer', 'individual')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: admins see all, freelancers see themselves
CREATE POLICY "Admins can do everything on profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Freelancers can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- SKUs: admins full access, freelancers read-only
CREATE POLICY "Admins can do everything on skus"
  ON skus FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Freelancers can view skus"
  ON skus FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'freelancer')
  );

-- Clients: admins full access
CREATE POLICY "Admins can do everything on clients"
  ON clients FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Manufacturers: admins full access
CREATE POLICY "Admins can do everything on manufacturers"
  ON manufacturers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Consignments: admins full access, freelancers see their own
CREATE POLICY "Admins can do everything on consignments"
  ON consignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Freelancers can view own consignments"
  ON consignments FOR SELECT
  USING (freelancer_id = auth.uid());

-- Sales: admins full access, freelancers see their own
CREATE POLICY "Admins can do everything on sales"
  ON sales FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Freelancers can view own sales"
  ON sales FOR SELECT
  USING (freelancer_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'freelancer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed the 6 default SKUs
INSERT INTO skus (name, carat_size, gold_type, cost_price, sell_price, flat_fee, quantity_available) VALUES
  ('Small / White Gold', 'Small', 'White', 0, 0, 0, 0),
  ('Small / Yellow Gold', 'Small', 'Yellow', 0, 0, 0, 0),
  ('Medium / White Gold', 'Medium', 'White', 0, 0, 0, 0),
  ('Medium / Yellow Gold', 'Medium', 'Yellow', 0, 0, 0, 0),
  ('Large / White Gold', 'Large', 'White', 0, 0, 0, 0),
  ('Large / Yellow Gold', 'Large', 'Yellow', 0, 0, 0, 0);
