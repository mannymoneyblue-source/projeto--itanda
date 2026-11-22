/*
# Ĉitanda — Correção da política de leitura de produtos

## Causa do problema
- A política RLS public_read_products chama is_admin(), uma função SECURITY
  DEFINER cujo EXECUTE está revogado a anon. Qualquer visita anónima que leia
  produtos recebia "permission denied for function is_admin".
- Como o catálogo, o produto individual e a criação de encomendas (via
  create_order, que lê products) dependem dessa leitura, o checkout inteiro
  falhava com "Erro ao processar encomenda".

## Alterações
- Substitui is_admin() por uma verificação inline (SELECT role FROM profiles
  WHERE id = auth.uid()) que não exige privilégios de execução especiais.
- Comportamento idêntico: visitantes veem produtos ativos; admins veem tudo.
- Nenhuma tabela, coluna ou dado é alterado.

## Segurança
- Permissões de EXECUTE de is_admin() mantêm-se revogadas para anon.
- A política continua a expor apenas produtos ativos ao público.
*/

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
