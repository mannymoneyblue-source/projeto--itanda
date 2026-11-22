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

### Alto — comprovativos de pagamento
A migration original permitia uploads anónimos para qualquer caminho do bucket e o cliente autenticado tinha UPDATE geral na tabela `payments`. A policy de comprovativo não limitava adequadamente caminho, tipo, tamanho ou estado do pagamento.

**Preparado em código:** a migration `20261122203000_auxiliary_security_hardening.sql` remove UPDATE geral de pagamentos, permite apenas anexar `proof_path`, valida a titularidade da encomenda pendente, restringe uploads ao diretório da encomenda e a ficheiros JPG/PNG/PDF até 5 MB, e impede substituir um comprovativo já anexado. O frontend valida MIME/tamanho, gera nomes UUID e usa a função `attach_payment_proof`.

**Limitação:** estas regras dependem da forma como o Storage preenche `metadata.mimetype` e `metadata.size`; precisam de teste num ambiente real antes da aplicação.

### Alto — notificações de login e denúncias públicas
A função `notify_new_login` aceitava um `p_user_id` fornecido pelo cliente, permitindo tentar criar notificações em nome de outra conta. A função pública `report_review` aceitava motivos sem limite e permitia incrementar denúncias indefinidamente.

**Preparado em código:** a migration `20261122203000_auxiliary_security_hardening.sql` exige que o ID do evento de login corresponda a `auth.uid()`, valida o método e limita o user-agent. As denúncias públicas ficam limitadas a 20 por avaliação e o motivo a 500 caracteres. Isto reduz spam, mas não substitui rate limiting por IP/identidade.

### Alto — validação do checkout e confirmação de pagamento
A função original `create_order` não impunha limites suficientes ao número de itens nem à quantidade por item. A confirmação de pagamento não verificava que o valor recebido correspondia ao total da encomenda e não impedia claramente reprocessamento.

**Preparado em código:** a migration `20261122193000_checkout_payment_hardening.sql` valida estrutura da lista, quantidade por produto, dados do cliente, tipo de sessão e limites numéricos. A confirmação bloqueia pagamentos já processados, compara o valor do pagamento com o total da encomenda e evita criar entregas duplicadas no mesmo processamento.

## Limitações e próximos passos

- Não foram executados `npm install`, build, testes automatizados ou testes de penetração.
- Não foi ligado nem inspecionado qualquer projeto Supabase.
- Nenhuma migration foi executada e nenhum dado de produção foi alterado.
- A implementação de downloads guest continua pendente; não aplicar a remoção de leitura anónima antes de existir uma alternativa guest testada.
- O texto de confirmação do checkout foi corrigido para deixar de prometer entrega de downloads por email, pois não foi encontrada uma integração de envio de email no fluxo analisado.
- A Edge Function depende de `SUPABASE_SERVICE_ROLE_KEY` configurada como secret no ambiente de funções; a chave não deve ser guardada no repositório.
- As migrations precisam de revisão contra o esquema efetivo antes de execução.

## Sequência de trabalho

1. Implementar um mecanismo guest sem leitura pública da tabela nem exposição de tokens no Data API.
2. Implementar um mecanismo de download guest seguro, sem leitura pública da tabela de entregas.
3. Verificar as policies de Storage com os metadados reais de upload.
4. Verificar compatibilidade das migrations e Edge Functions.
5. Instalar dependências, executar build e testes automatizados.
6. Rever o diff final e atualizar o Pull Request antes de qualquer merge.

## Revisão adicional — criação de pagamentos

Foi identificado que o cliente enviava o campo `amount` diretamente ao inserir uma linha em `payments`. Embora a confirmação compare o valor com o total da encomenda, o cliente poderia registar um valor divergente e bloquear a confirmação legítima. Foi preparada a migração `20261122213000_server_side_payment_creation.sql`: a nova RPC obtém o total da encomenda no banco, verifica sessão/posse, estado pendente, método, referência e ausência de pagamento anterior; o INSERT direto de clientes é revogado. O frontend agora chama a RPC e deixa de enviar o montante.

**Ainda por validar:** a migração não foi executada. Confirmar que as permissões existentes, as colunas e os tipos de `payments` correspondem ao SQL; testar checkout autenticado e convidado, upload de comprovativo, repetição de pedidos e confirmação administrativa num ambiente de teste. A migração de criação de pagamento deve ser aplicada em conjunto com a revisão das políticas atuais de INSERT em `payments`.

## Revisão adicional — checkout parcialmente criado

O fluxo anterior fazia duas chamadas independentes: primeiro criava a encomenda e depois o pagamento. Se a segunda chamada falhasse, a encomenda ficava pendente sem pagamento associado. Foi preparada a migração `20261122220000_atomic_checkout_creation.sql` e o frontend passou a chamar `create_checkout`, que cria ambos dentro da mesma transação. Se qualquer etapa falhar, a transação reverte e não deixa uma encomenda incompleta. As permissões de execução das funções internas foram retiradas dos clientes, mantendo a nova RPC como entrada pública.

**Validação pendente:** confirmar o comportamento de funções SECURITY DEFINER encadeadas e as permissões do proprietário no ambiente de teste; testar convidado, utilizador autenticado, comprovativo inválido, repetição de submissão e falha de upload. O upload do comprovativo ocorre depois da transação: se falhar, a encomenda e o pagamento continuam corretamente pendentes, podendo o comprovativo ser enviado depois.
