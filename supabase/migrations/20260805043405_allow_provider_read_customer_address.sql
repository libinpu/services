/*
# Allow providers to read customer addresses for assigned bookings

## Problem
When a customer creates a booking and a provider accepts it, the provider job page
tries to load the booking's nested `address` relation. However, the `addresses` table
RLS policy only allows the owner (`auth.uid() = user_id`) to SELECT rows. The provider
is NOT the owner of the customer's address, so RLS silently filters it out — the
address comes back as `null` even though the row exists.

## Fix
Add a new SELECT policy on `addresses` that allows a provider to read an address if
there is at least one booking assigned to them (provider_id = auth.uid()) that
references that address (address_id = addresses.id).

## Security
- Read-only — no INSERT/UPDATE/DELETE changes.
- Scoped: provider can only see addresses linked to bookings assigned to them.
- The existing owner-scoped policies remain unchanged.
*/

-- Allow providers to read addresses that belong to bookings assigned to them
DROP POLICY IF EXISTS "select_provider_assigned_addresses" ON addresses;
CREATE POLICY "select_provider_assigned_addresses" ON addresses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.address_id = addresses.id
        AND bookings.provider_id = auth.uid()
    )
  );
