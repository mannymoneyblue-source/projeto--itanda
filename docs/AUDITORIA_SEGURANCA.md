# Auditoria de segurança — Ĉitanda

**Base analisada:** branch `main`, commit `45c307c27ada661d8371345e3a52e648ef8253dc`  
**Trabalho atual:** branch `security/auditoria-e-correcoes`  
**Estado:** análise estática e correções preparadas em migrations/código. Nenhuma migration foi executada numa base de dados.

## Achados e estado das correções

### Crítico — escalada de privilégios em profiles
A migration inicial concede `SELECT, UPDATE` em `profiles` a `authenticated`, enquanto a policy permite atualizar a própria linha. Sem restrição de colunas, a coluna `role` pode ser alvo de alteração pelo próprio utilizador.

**Preparado em código:** a migration `20261122183000_citanda_security_hardening.sql` revoga UPDATE geral e concede UPDATE apenas em `full_name` e `phone`. Confirmar a compatibilidade com o esquema real antes de aplicar.

### Crítico — leitura pública de entregas digitais
A migration inicial concede `SELECT` em `digital_deliveries` a `anon` e cria uma policy para entregas sem cliente autenticado. A tabela contém `download_token`, podendo expor tokens de convidados.

**Preparado em código:** a migration de hardening revoga a leitura anónima e remove a policy pública. O fluxo de download para convidados ainda não foi substituído; por isso, aplicar esta migration antes de implementar e testar uma alternativa guest pode interromper os downloads de convidados.

### Crítico — autorização demasiado ampla no Storage
A policy original de `customer_read_digital_files` verifica apenas se o utilizador tem alguma entrega válida, sem relacionar o objeto solicitado ao produto comprado.

**Preparado em código:** a migration de hardening associa o caminho do objeto ao `file_path` do produto da entrega do utilizador. Ainda é necessário testar as permissões e o comportamento do Storage no ambiente de destino.

### Alto — UPDATE direto em digital_deliveries
A migration inicial concede UPDATE direto a utilizadores autenticados, permitindo potencialmente alterar contagem, limite, expiração e token.

**Preparado em código:** a migration de hardening revoga UPDATE direto e remove a policy correspondente. A contagem de downloads passa a ser controlada pela Edge Function para clientes autenticados.

### Alto — uploads de comprovativos sem restrição suficiente
A policy inicial de INSERT para o bucket de comprovativos permite uploads de `anon, authenticated` com validação limitada.

**Pendente:** rever o fluxo guest e as regras de Storage em conjunto, para restringir caminho, tipo e tamanho sem quebrar o checkout.

### Alto — download autenticado
O frontend original tentava usar `download_token` como se fosse um token de acesso do Storage, e a função de incremento não emitia URL assinada.

**Preparado em código:** a Edge Function `download-digital-file` valida a sessão, confirma a titularidade da entrega, verifica expiração e limite, gera URL assinada de curta duração e regista o download. O frontend passou a chamar essa função e deixou de receber o token da tabela.

**Limitação:** a implementação atual cobre apenas clientes autenticados. O fluxo guest precisa de um mecanismo seguro próprio antes de ser considerado concluído.

### Alto — validação do checkout e confirmação de pagamento
A função original `create_order` não impunha limites suficientes ao número de itens nem à quantidade por item. A confirmação de pagamento não verificava que o valor recebido correspondia ao total da encomenda e não impedia claramente reprocessamento.

**Preparado em código:** a migration `20261122193000_checkout_payment_hardening.sql` valida estrutura da lista, quantidade por produto, dados do cliente, tipo de sessão e limites numéricos. A confirmação bloqueia pagamentos já processados, compara o valor do pagamento com o total da encomenda e evita criar entregas duplicadas no mesmo processamento.

## Limitações e próximos passos

- Não foram executados `npm install`, build, testes automatizados ou testes de penetração.
- Não foi ligado nem inspecionado qualquer projeto Supabase.
- Nenhuma migration foi executada e nenhum dado de produção foi alterado.
- A implementação de downloads guest continua pendente; não aplicar a remoção de leitura anónima antes de existir uma alternativa guest testada.
- A Edge Function depende de `SUPABASE_SERVICE_ROLE_KEY` configurada como secret no ambiente de funções; a chave não deve ser guardada no repositório.
- As migrations precisam de revisão contra o esquema efetivo antes de execução.

## Sequência de trabalho

1. Implementar um mecanismo guest sem leitura pública da tabela nem exposição de tokens no Data API.
2. Rever uploads de comprovativos e notificações de login.
3. Verificar compatibilidade das migrations e Edge Functions.
4. Instalar dependências, executar build e testes automatizados.
5. Rever o diff final e atualizar o Pull Request antes de qualquer merge.
