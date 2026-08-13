-- Add `assigned` status: provider matched but has not accepted yet.

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'assigned',
    'accepted',
    'on_the_way',
    'arrived',
    'in_progress',
    'awaiting_confirmation',
    'completed',
    'cancelled',
    'rejected'
  ));

CREATE INDEX IF NOT EXISTS idx_bookings_status_assigned
  ON public.bookings (status)
  WHERE status = 'assigned';

CREATE INDEX IF NOT EXISTS idx_bookings_provider_active
  ON public.bookings (provider_id, status)
  WHERE status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress');
