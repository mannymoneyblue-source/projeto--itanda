-- ============================================================================
-- FASE 1: Transferência bancária — comprovativos + rejeição de pagamento
-- ============================================================================

-- Coluna para guardar o caminho do comprovativo no storage
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_path text;

-- Clientes e convidados só podem alterar o comprovativo da sua própria encomenda
-- (grant de coluna restringe a apenas esta coluna)
GRANT UPDATE (proof_path) ON payments TO anon, authenticated;

DROP POLICY IF EXISTS "customer_update_payment_proof" ON payments;
CREATE POLICY "customer_update_payment_proof" ON payments FOR UPDATE
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = payments.order_id
      AND (o.customer_id = auth.uid() OR o.customer_id IS NULL)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = payments.order_id
      AND (o.customer_id = auth.uid() OR o.customer_id IS NULL)
  ));

-- ============================================================================
-- reject_payment — SECURITY DEFINER: admin rejeita pagamento e cancela encomenda
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_payment(
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem rejeitar pagamentos';
  END IF;

  SELECT order_id INTO v_order_id FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  UPDATE payments
  SET status = 'rejected',
      notes = COALESCE(p_reason, notes),
      updated_at = now()
  WHERE id = p_payment_id;

  UPDATE orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = v_order_id;

  INSERT INTO admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (auth.uid(), 'reject_payment', 'payments', p_payment_id, jsonb_build_object('order_id', v_order_id, 'reason', p_reason));
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_payment(uuid, text) TO authenticated;

-- ============================================================================
-- Bucket privado para comprovativos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anyone_upload_payment_proofs" ON storage.objects;
CREATE POLICY "anyone_upload_payment_proofs" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "admin_read_payment_proofs" ON storage.objects;
CREATE POLICY "admin_read_payment_proofs" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'payment-proofs' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_payment_proofs" ON storage.objects;
CREATE POLICY "admin_delete_payment_proofs" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'payment-proofs' AND is_admin());
