-- Auxiliary security hardening: login events, review reports and payment proofs.
-- Prepared for review only. This migration has NOT been applied to any database.

BEGIN;

-- A signed-in client may only create a login event for its own auth identity.
CREATE OR REPLACE FUNCTION public.notify_new_login(
  p_user_id uuid,
  p_login_method text DEFAULT 'password',
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF p_login_method NOT IN ('password', 'google') THEN
    RAISE EXCEPTION 'Método de login inválido';
  END IF;

  INSERT INTO public.login_notifications (user_id, login_method, user_agent)
  VALUES (auth.uid(), p_login_method, left(COALESCE(p_user_agent, ''), 512));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_login(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_new_login(uuid, text, text) TO authenticated;

-- Limit public review-report spam and bound untrusted input.
CREATE OR REPLACE FUNCTION public.report_review(p_review_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_reason IS NOT NULL AND length(p_reason) > 500 THEN
    RAISE EXCEPTION 'O motivo da denúncia é demasiado longo';
  END IF;

  UPDATE public.product_reviews
  SET is_reported = true,
      report_count = report_count + 1,
      last_reported_at = now(),
      report_reason = COALESCE(NULLIF(left(btrim(p_reason), 500), ''), report_reason)
  WHERE id = p_review_id
    AND report_count < 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.report_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_review(uuid, text) TO anon, authenticated;

-- Remove direct payment-row UPDATE. Clients may only attach a proof path;
-- payment status and amount remain server/admin controlled.
DROP POLICY IF EXISTS "customer_update_payment_proof" ON public.payments;
REVOKE UPDATE ON TABLE public.payments FROM anon, authenticated;
GRANT UPDATE (proof_path) ON TABLE public.payments TO anon, authenticated;

-- SECURITY DEFINER helper avoids depending on anon SELECT access to orders/payments
-- from inside Storage and payments RLS policies.
CREATE OR REPLACE FUNCTION public.can_submit_payment_proof(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS (
    SELECT 1
    FROM public.orders AS o
    JOIN public.payments AS p ON p.order_id = o.id
    WHERE o.id = p_order_id
      AND o.status = 'pending'
      AND p.status = 'pending'
      AND (
        (auth.uid() IS NULL AND o.customer_id IS NULL)
        OR (auth.uid() IS NOT NULL AND o.customer_id = auth.uid())
      )
  );
$;

REVOKE EXECUTE ON FUNCTION public.can_submit_payment_proof(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_submit_payment_proof(uuid) TO anon, authenticated;

CREATE POLICY "customer_update_payment_proof"
ON public.payments
FOR UPDATE
TO anon, authenticated
USING (
  status = 'pending'
  AND public.can_submit_payment_proof(order_id)
)
WITH CHECK (
  status = 'pending'
  AND proof_path IS NOT NULL
  AND proof_path LIKE order_id::text || '/%'
  AND public.can_submit_payment_proof(order_id)
);

-- Uploads must target a real pending order/payment and use an allowed file type,
-- a bounded size and a server-generated UUID filename under that order's folder.
DROP POLICY IF EXISTS "anyone_upload_payment_proofs" ON storage.objects;
CREATE POLICY "anyone_upload_payment_proofs"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|pdf)$'
  AND COALESCE(metadata->>'mimetype', '') IN ('image/jpeg', 'image/png', 'application/pdf')
  AND COALESCE(metadata->>'size', '') ~ '^[0-9]+$'
  AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880
  AND public.can_submit_payment_proof(split_part(name, '/', 1)::uuid)
);

-- Attach only an uploaded object under the matching pending order folder.
CREATE OR REPLACE FUNCTION public.attach_payment_proof(
  p_payment_id uuid,
  p_proof_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_customer_id uuid;
BEGIN
  IF p_proof_path IS NULL OR length(p_proof_path) > 300 THEN
    RAISE EXCEPTION 'Caminho de comprovativo inválido';
  END IF;

  SELECT o.id, o.customer_id
  INTO v_order_id, v_customer_id
  FROM public.payments AS p
  JOIN public.orders AS o ON o.id = p.order_id
  WHERE p.id = p_payment_id
    AND p.status = 'pending'
    AND o.status = 'pending'
  FOR UPDATE OF p, o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento pendente não encontrado';
  END IF;

  IF v_customer_id IS DISTINCT FROM auth.uid()
     AND NOT (v_customer_id IS NULL AND auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF p_proof_path !~* ('^' || v_order_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|pdf)$') THEN
    RAISE EXCEPTION 'O comprovativo não pertence a esta encomenda';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'payment-proofs'
      AND name = p_proof_path
  ) THEN
    RAISE EXCEPTION 'Ficheiro de comprovativo não encontrado';
  END IF;

  UPDATE public.payments
  SET proof_path = p_proof_path
  WHERE id = p_payment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_payment_proof(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_payment_proof(uuid, text) TO anon, authenticated;

-- The old RPC increments a counter without issuing a signed URL. Downloads now
-- go through the authorized Edge Function, which performs the counter update.
REVOKE EXECUTE ON FUNCTION public.increment_download_count(uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
