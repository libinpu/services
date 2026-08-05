/*
# Add Bill Photo to Booking Items

## Purpose
When a professional purchases additional materials during a job (e.g. a pipe, a
switch, paint), they need to upload a photo of the purchase bill/receipt so the
customer can see proof of the extra cost before approving the charge.

## 1. booking_items — new column
- `bill_photo_url` (text, nullable) — URL or data-URI of the uploaded material bill photo.
  Stored alongside the existing `description_en`, `description_ml`, and `amount` fields.

## 2. Security
- RLS is already enabled on `booking_items`. The existing SELECT / INSERT / UPDATE
  policies scope access through the parent booking (customer_id OR provider_id =
  auth.uid()), so the new column is automatically covered — no policy changes needed.

## 3. Idempotency
The column addition uses a DO $$ ... IF NOT EXISTS ... END $$ block so the migration
can be safely re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_items' AND column_name = 'bill_photo_url') THEN
    ALTER TABLE booking_items ADD COLUMN bill_photo_url text;
  END IF;
END $$;
