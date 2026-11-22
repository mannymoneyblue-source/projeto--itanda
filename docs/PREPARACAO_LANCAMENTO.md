# Preparação da atualização — Ĉitanda

## Estado e proteção da versão publicada

- A aplicação publicada continua na versão anterior.
- Esta atualização permanece isolada na branch `security/auditoria-e-correcoes`.
- Não fazer merge da PR nem publicar automaticamente.
- Não aplicar migrações na base de produção antes da atualização do frontend.
- Não colocar chaves Supabase (sobretudo `service_role`) no código, repositório ou variáveis públicas do frontend.

## Alterações que a nova aplicação espera na base de dados

O frontend desta branch depende das seguintes RPCs e políticas, ainda não aplicadas na base de produção:

- `create_checkout`: cria encomenda e pagamento pendente numa única transação.
- `create_order_payment`: criação de pagamento no servidor para fluxos separados.
- `attach_payment_proof`: associa o comprovativo depois do upload.
- Restrições adicionais em perfis, pagamentos, entregas digitais e Storage.

A aplicação antiga não deve continuar ativa contra estas restrições depois de as migrações serem aplicadas: o checkout antigo e o envio antigo de comprovativos podem deixar de funcionar.

## Dependências da nova aplicação

- Edge Function `download-digital-file` publicada no projeto Supabase correto.
- Secret `SUPABASE_SERVICE_ROLE_KEY` configurado apenas nos secrets da Edge Function.
- Migrações da branch aplicadas na ordem validada antes do teste integrado.
- Variáveis públicas de frontend (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) configuradas no serviço de alojamento, sem service-role key.

## Sequência de lançamento

1. Rever o diff completo da branch e resolver todos os pontos pendentes.
2. Executar `npm ci`, `npm run typecheck`, `npm run lint` e `npm run build`.
3. Fazer deploy de pré-visualização sem substituir a versão publicada.
4. Validar autenticação, catálogo, checkout de cliente autenticado, checkout convidado, upload/associação de comprovativo, confirmação/rejeição administrativa e downloads de conta.
5. Preparar backup e plano de reversão; confirmar que a versão antiga não será reativada depois de migrações incompatíveis.
6. Só com aprovação explícita, integrar a branch e coordenar a publicação com as migrações e a Edge Function.
7. Fazer testes de fumo imediatamente após o lançamento e monitorizar erros.

## Matriz mínima de testes

| Área | Cenário | Resultado esperado |
|---|---|---|
| Catálogo | Visitante abre catálogo e produto | Produtos ativos e detalhes visíveis |
| Checkout | Cliente autenticado compra | Uma encomenda e um pagamento pendente |
| Checkout | Visitante compra | Uma encomenda e um pagamento pendente; sem promessa de download automático para convidado |
| Integridade | Item repetido, quantidade inválida ou produto inativo | Pedido rejeitado pelo servidor |
| Comprovativo | JPG/PNG/PDF até 5 MB | Upload e associação à payment correspondente |
| Comprovativo | Tipo não permitido ou ficheiro acima de 5 MB | Rejeição no frontend e no Storage |
| Administração | Utilizador não administrador tenta confirmar pagamento | Operação recusada |
| Administração | Administrador confirma pagamento | Pagamento e entrega criados de forma consistente |
| Downloads | Dono da entrega descarrega ficheiro válido | Link assinado curto e contador incrementado |
| Downloads | Outro utilizador tenta usar o ID da entrega | Acesso recusado |
| Downloads | Entrega expirada ou limite atingido | Download recusado |

## Limitações conhecidas antes do lançamento

- Compras como convidado ainda não têm fluxo de download digital automático nesta versão; a interface deve continuar a informar isso claramente.
- A Edge Function e os testes de integração ainda precisam de ser executados no projeto de pré-visualização.
- Não considerar a atualização pronta apenas porque os ficheiros estão no GitHub: os testes de build e os testes funcionais são obrigatórios.
