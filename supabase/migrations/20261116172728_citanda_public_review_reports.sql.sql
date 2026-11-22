/*
# Ĉitanda — Denúncias públicas de avaliações

## Alterações

### 1. Tabela product_reviews — novas colunas
- report_count: número de denúncias recebidas (integer, default 0)
- last_reported_at: data da denúncia mais recente (timestamptz, nullable)

### 2. Nova função report_review(p_review_id, p_reason)
- SECURITY DEFINER: permite que qualquer visitante (anon ou autenticado) denuncie
  uma avaliação, sem poder alterar qualquer outro campo.
- Incrementa report_count, marca is_reported = true e guarda o motivo.
- Ignora denúncias de avaliações inexistentes (nenhum erro visível ao público).

## Segurança
- RLS mantém-se intacto: o público NÃO ganha UPDATE na tabela.
- Apenas a função pode marcar denúncias; não expõe dados adicionais.
- EXECUTE concedido a anon + authenticated; revogado de PUBLIC.
*/

ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS last_reported_at timestamptz;

CREATE OR REPLACE FUNCTION report_review(p_review_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE product_reviews
  SET is_reported = true,
      report_count = report_count + 1,
      last_reported_at = now(),
      report_reason = COALESCE(NULLIF(trim(p_reason), ''), report_reason)
  WHERE id = p_review_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION report_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION report_review(uuid, text) TO anon, authenticated;
