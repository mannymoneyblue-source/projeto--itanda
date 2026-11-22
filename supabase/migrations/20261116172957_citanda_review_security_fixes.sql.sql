/*
# Ĉitanda — Segurança de avaliações e nomes públicos

## Alterações

### 1. Nova função pública reviewer_name(p_user_id)
- SECURITY DEFINER: devolve o nome do autor de uma avaliação a qualquer visitante,
  sem expor emails, telefones ou o resto do perfil (que continua privado).
- Devolve "Anónimo" quando o perfil não tem nome.

### 2. Escritura de avaliações restrita a colunas seguras
- A partir de agora, o cliente só pode definir rating e comment ao criar/editar
  a sua avaliação. Campos de moderação (is_verified_purchase, is_hidden,
  is_reported, report_reason, report_count, last_reported_at, product_id e
  user_id) deixam de poder ser alterados pelo cliente, fechando a falha em que
  um utilizador podia marcar a própria avaliação como "compra verificada".
- A verificação de compra continua a ser calculada automaticamente pelo gatilho
  existente (set_verified_purchase), que roda no servidor.

## Segurança
- EXECUTE da nova função concedido a anon + authenticated; revogado de PUBLIC.
- GRANT/REVOKE aplicados a product_reviews; as políticas RLS mantêm-se iguais.
*/

CREATE OR REPLACE FUNCTION reviewer_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(full_name, ''), 'Anónimo')
  FROM profiles
  WHERE id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION reviewer_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reviewer_name(uuid) TO anon, authenticated;

REVOKE INSERT, UPDATE ON product_reviews FROM authenticated;
GRANT INSERT (product_id, rating, comment) ON product_reviews TO authenticated;
GRANT UPDATE (rating, comment) ON product_reviews TO authenticated;
