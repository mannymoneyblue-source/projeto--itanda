-- Additional checkout/payment hardening.
-- This migration is intentionally committed only; it has NOT been applied to a database.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,
  p_customer_email text,
  p_customer_name text DEFAULT '',
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_guest boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_product_id uuid;
  v_quantity integer;
  v_subtotal bigint;
  v_total bigint := 0;
  v_customer_id uuid := auth.uid();
  v_seen_product_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'A lista de itens da encomenda é inválida';
  END IF;
  IF jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'A encomenda deve conter entre 1 e 50 itens';
  END IF;

  IF p_customer_email IS NULL
     OR length(btrim(p_customer_email)) > 254
     OR btrim(p_customer_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Endereço de email inválido';
  END IF;

  IF length(btrim(COALESCE(p_customer_name, ''))) > 120
     OR length(COALESCE(p_customer_phone, '')) > 30
     OR length(COALESCE(p_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'Os dados da encomenda excedem os limites permitidos';
  END IF;

  IF (v_customer_id IS NULL AND p_is_guest IS NOT TRUE)
     OR (v_customer_id IS NOT NULL AND p_is_guest IS NOT FALSE) THEN
    RAISE EXCEPTION 'O tipo de encomenda não corresponde à sessão atual';
  END IF;

  INSERT INTO orders (
    customer_id, status, total, customer_email, customer_name,
    customer_phone, is_guest, notes
  )
  VALUES (
    v_customer_id, 'pending', 0, lower(btrim(p_customer_email)),
    btrim(COALESCE(p_customer_name, '')), NULLIF(btrim(p_customer_phone), ''),
    p_is_guest, NULLIF(btrim(p_notes), '')
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR COALESCE(v_item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR COALESCE(v_item->>'quantity', '') !~ '^[0-9]{1,2}$' THEN
      RAISE EXCEPTION 'Um dos itens da encomenda é inválido';
    END IF;

    v_product_id := (v_item->>'product_id')::uuid;
    IF v_product_id = ANY(v_seen_product_ids) THEN
      RAISE EXCEPTION 'A encomenda não pode repetir o mesmo produto';
    END IF;
    v_seen_product_ids := array_append(v_seen_product_ids, v_product_id);

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity < 1 OR v_quantity > 20 THEN
      RAISE EXCEPTION 'A quantidade por produto deve estar entre 1 e 20';
    END IF;

    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id AND is_active = true
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não encontrado ou inativo';
    END IF;

    v_subtotal := v_product.price::bigint * v_quantity;
    v_total := v_total + v_subtotal;
    IF v_subtotal > 2147483647 OR v_total > 2147483647 THEN
      RAISE EXCEPTION 'O valor total da encomenda excede o limite permitido';
    END IF;

    INSERT INTO order_items (
      order_id, product_id, product_name, price, quantity, subtotal
    )
    VALUES (
      v_order_id, v_product.id, v_product.name, v_product.price,
      v_quantity, v_subtotal::integer
    );
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'O total da encomenda deve ser superior a zero';
  END IF;

  UPDATE orders SET total = v_total::integer WHERE id = v_order_id;
  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order(jsonb, text, text, text, text, boolean)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, text, text, text, text, boolean)
  TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_payment_id uuid,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_order orders%ROWTYPE;
  v_item order_items%ROWTYPE;
  v_token text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem confirmar pagamentos';
  END IF;

  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Este pagamento já foi processado';
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE id = v_payment.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encomenda não encontrada';
  END IF;

  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'A encomenda não está pendente';
  END IF;

  IF v_payment.amount <> v_order.total THEN
    RAISE EXCEPTION 'O valor do pagamento não corresponde ao total da encomenda';
  END IF;

  UPDATE payments
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now(),
      reference = COALESCE(NULLIF(btrim(p_reference), ''), reference),
      notes = COALESCE(NULLIF(btrim(p_notes), ''), notes),
      updated_at = now()
  WHERE id = p_payment_id;

  UPDATE orders
  SET status = 'paid', updated_at = now()
  WHERE id = v_order.id;

  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = v_order.id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM digital_deliveries
      WHERE order_id = v_order.id AND product_id = v_item.product_id
    ) THEN
      v_token := encode(gen_random_bytes(32), 'hex');
      INSERT INTO digital_deliveries (
        order_id, product_id, customer_id, download_token,
        max_downloads, expires_at
      )
      VALUES (
        v_order.id, v_item.product_id, v_order.customer_id, v_token,
        5, now() + interval '30 days'
      );
    END IF;
  END LOOP;

  INSERT INTO admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(), 'confirm_payment', 'payments', p_payment_id,
    jsonb_build_object('order_id', v_order.id, 'amount', v_order.total)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_payment(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, text, text)
  TO authenticated;

COMMIT;
