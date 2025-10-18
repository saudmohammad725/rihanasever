-- Migration: إضافة رقم الفاتورة والرقم المشفر للحجوزات الموجودة

-- 1. إضافة الأعمدة الجديدة
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS encrypted_code TEXT;

-- 2. تحديث status enum لإضافة rejected
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected'));

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

-- 7. تحديث الحجوزات الموجودة بأرقام فاتورة ورموز
-- استخدام CTE لتجنب مشكلة Window Functions في UPDATE
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

-- 8. Create index for invoice_number
CREATE INDEX IF NOT EXISTS bookings_invoice_number_idx ON bookings(invoice_number);

