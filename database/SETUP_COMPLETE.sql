-- ========================================
-- SETUP COMPLETE - Rihana Database Schema
-- نسخ هذا الملف بالكامل وتنفيذه في Supabase SQL Editor
-- ========================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  notes TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  invoice_number TEXT UNIQUE,
  encrypted_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- 4. Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  invoice_num TEXT;
BEGIN
  SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('invoice_seq')::TEXT, 6, '0') INTO invoice_num;
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to generate encrypted code
CREATE OR REPLACE FUNCTION generate_encrypted_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RHN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 12));
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-generate invoice number and encrypted code
CREATE OR REPLACE FUNCTION set_booking_codes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  IF NEW.encrypted_code IS NULL THEN
    NEW.encrypted_code := generate_encrypted_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_set_codes_trigger ON bookings;

CREATE TRIGGER bookings_set_codes_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_codes();

-- 7. Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create visitors table for tracking
CREATE TABLE IF NOT EXISTS visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings(created_at);
CREATE INDEX IF NOT EXISTS bookings_invoice_number_idx ON bookings(invoice_number);
CREATE INDEX IF NOT EXISTS visitors_visited_at_idx ON visitors(visited_at);
CREATE INDEX IF NOT EXISTS visitors_page_idx ON visitors(page);

-- 10. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- 11. Create policies for users
CREATE POLICY "Enable read access for users" ON users
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for users" ON users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for users" ON users
  FOR UPDATE
  USING (true);

-- 12. Create policies for bookings
CREATE POLICY "Enable read access for all users" ON bookings
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON bookings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON bookings
  FOR UPDATE
  USING (true);

-- 13. Create policies for admins (only service role can access)
CREATE POLICY "Enable read access for admins only" ON admins
  FOR SELECT
  USING (true);

-- 14. Create policies for visitors (allow insert for tracking)
CREATE POLICY "Enable insert for visitors" ON visitors
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable read for admins" ON visitors
  FOR SELECT
  USING (true);

-- 15. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 16. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON bookings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at 
  BEFORE UPDATE ON admins
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 17. تحديث الحجوزات الموجودة (إن وجدت) بأرقام فاتورة ورموز
-- يمكن تخطي هذا إذا كانت قاعدة البيانات جديدة
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM bookings WHERE invoice_number IS NULL LIMIT 1) THEN
    WITH numbered_bookings AS (
      SELECT 
        id,
        created_at,
        'INV-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0') AS new_invoice_number,
        'RHN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || created_at::TEXT) FROM 1 FOR 12)) AS new_encrypted_code
      FROM bookings
      WHERE invoice_number IS NULL
    )
    UPDATE bookings
    SET 
      invoice_number = numbered_bookings.new_invoice_number,
      encrypted_code = numbered_bookings.new_encrypted_code
    FROM numbered_bookings
    WHERE bookings.id = numbered_bookings.id;
  END IF;
END $$;

-- ========================================
-- تم بنجاح! ✅
-- الآن قاعدة البيانات جاهزة للاستخدام
-- ========================================

