/*
# Ĉitanda — Moderação de avaliações via função privilegiada

## Alterações

### Nova função admin_moderate_review(p_review_id, p_action, p_reason)
- SECURITY DEFINER: permite ao administrador ocultar/mostrar/denunciar
  avaliações, já que a escrita direta dessas colunas foi removida do cliente.
- p_action: 'hide' | 'show' | 'report'.
- Verifica is_admin() no servidor; caso contrário lança erro.

## Segurança
- EXECUTE apenas para authenticated; revogado de PUBLIC e anon.
- Mantém o princípio: clientes normais nunca escrevem colunas de moderação.
*/

CREATE OR REPLACE FUNCTION admin_moderate_review(
  p_review_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_action NOT IN ('hide', 'show', 'report') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  UPDATE product_reviews SET
    is_hidden = CASE WHEN p_action = 'hide' THEN true WHEN p_action = 'show' THEN false ELSE is_hidden END,
    is_reported = CASE WHEN p_action = 'report' THEN true ELSE is_reported END,
    report_reason = CASE WHEN p_action = 'report' THEN COALESCE(NULLIF(trim(p_reason), ''), report_reason) ELSE report_reason END
  WHERE id = p_review_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_moderate_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_moderate_review(uuid, text, text) TO authenticated;
