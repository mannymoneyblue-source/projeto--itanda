/*
# Ĉitanda — Permitir pagamento em encomendas de convidado

## Causa do problema
- A política RLS de pagamentos só permitia INSERT a utilizadores com sessão
  iniciada (cliente ou admin). Como o checkout aceita compras de convidado,
  o passo "registar pagamento" falhava com violação de RLS — o cliente via
  "Erro ao processar encomenda" mesmo com a encomenda criada.

## Alterações
- Nova política guest_insert_payments: um visitante anónimo pode criar um
  pagamento pendente numa encomenda de convidado (customer_id IS NULL),
  apenas nos métodos válidos e sempre com estado "pending".
- Não altera policies existentes de clientes autenticados nem de admins.

## Segurança
- O anónimo não consegue associar pagamentos a encomendas de clientes
  registados, nem forçar estado diferente de "pending".
- A confirmação/rejeição continua exclusiva do admin (admin_update_payments).
*/

DROP POLICY IF EXISTS "guest_insert_payments" ON payments;
CREATE POLICY "guest_insert_payments" ON payments FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
        AND o.customer_id IS NULL
    )
    AND payments.status = 'pending'
    AND payments.method IN ('transfer', 'reference')
  );
