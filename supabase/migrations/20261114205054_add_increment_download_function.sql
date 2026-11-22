/*
# Add increment_download_count function

Adds a SECURITY DEFINER function to increment the download count on a digital delivery.
Accessible to authenticated users who own the delivery.
*/

CREATE OR REPLACE FUNCTION increment_download_count(p_delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE digital_deliveries
  SET download_count = download_count + 1
  WHERE id = p_delivery_id
    AND (customer_id = auth.uid() OR is_admin())
    AND download_count < max_downloads
    AND expires_at > now();
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_download_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_download_count(uuid) TO authenticated;
