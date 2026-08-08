-- Allow authenticated users to read reviews so provider pages can display customer feedback.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reviews" ON public.reviews;
CREATE POLICY "select_reviews_for_authenticated" ON public.reviews FOR SELECT
  TO authenticated USING (true);
