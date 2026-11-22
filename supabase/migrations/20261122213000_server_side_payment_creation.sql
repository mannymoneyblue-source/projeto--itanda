-- Derive payment amount from the persisted order, never from browser input.
-- Review-only migration: do not apply until schema and RLS behavior are verified.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_payment(
  p_order_id uuid,
  p_method text,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_payment_id uuid;
BEGIN
  IF p_method NOT IN ('transfer', 'reference') THEN
    RAISE EXCEPTION 'Método de pagamento inválido';
  END IF;

  IF p_reference IS NOT NULL AND length(p_reference) > 120 THEN
    RAISE EXCEPTION 'A referência de pagamento é demasiado longa';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Encomenda pendente não encontrada';
  END IF;

  IF v_order.customer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE order_id = p_order_id
  ) THEN
    RAISE EXCEPTION 'Esta encomenda já possui um pagamento registado';
  END IF;

  IF v_order.total IS NULL OR v_order.total <= 0 THEN
    RAISE EXCEPTION 'O total da encomenda é inválido';
  END IF;

  INSERT INTO public.payments (
    order_id, method, amount, reference, status
  )
  VALUES (
    v_order.id,
    p_method,
    v_order.total,
    NULLIF(btrim(p_reference), ''),
    'pending'
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_payment(uuid, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_payment(uuid, text, text)
  TO anon, authenticated;

-- Force clients through the server-side function so amount/status cannot be forged.
REVOKE INSERT ON TABLE public.payments FROM anon, authenticated;

COMMIT;
