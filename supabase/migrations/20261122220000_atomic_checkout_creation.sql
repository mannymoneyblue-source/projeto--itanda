-- Make order + payment creation atomic. A failed payment creation must not
-- leave an orphan pending order in the database.
-- Review-only migration: not applied to any Supabase project.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_checkout(
  p_items jsonb,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_notes text,
  p_is_guest boolean,
  p_method text,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_payment_id uuid;
BEGIN
  v_order_id := public.create_order(
    p_items,
    p_customer_email,
    p_customer_name,
    p_customer_phone,
    p_notes,
    p_is_guest
  );

  v_payment_id := public.create_order_payment(
    v_order_id,
    p_method,
    p_reference
  );

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id
  );
END;
$$;

-- Clients must use the atomic entry point rather than creating half a checkout.
REVOKE EXECUTE ON FUNCTION public.create_order(jsonb, text, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_payment(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_checkout(jsonb, text, text, text, text, boolean, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_checkout(jsonb, text, text, text, text, boolean, text, text)
  TO anon, authenticated;

COMMIT;
