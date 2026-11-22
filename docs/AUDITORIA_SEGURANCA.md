# Auditoria de segurança — Ĉitanda

**Base analisada:** branch `main`, commit `45c307c27ada661d8371345e3a52e648ef8253dc`  
**Estado:** análise estática do código e das migrations; nenhuma alteração foi aplicada à base de dados.

## Achados confirmados

### Crítico — escalada de privilégios em profiles
A migration inicial concede `SELECT, UPDATE` em `profiles` a `authenticated`, enquanto a policy `update_own_profile` permite ao utilizador atualizar a própria linha. Como não há restrição de colunas nesse grant, a coluna `role` pode ser alvo de alteração pelo próprio utilizador.

**Correção proposta:** revogar o UPDATE geral e conceder UPDATE apenas às colunas de perfil que o cliente realmente pode editar (confirmar primeiro os campos usados pelo frontend). A atribuição de `role` deve permanecer exclusiva de uma operação administrativa confiável.

### Crítico — leitura pública de entregas digitais
A migration inicial concede `SELECT` em `digital_deliveries` a `anon` e cria a policy `anon_read_deliveries` para registos com `customer_id IS NULL`. A tabela contém `download_token`, pelo que os tokens de entregas guest podem ser expostos.

**Correção proposta:** remover a leitura anónima da tabela. Se o negócio precisar de downloads guest, implementar um endpoint autenticado por token individual, que devolva apenas um link temporário para o ficheiro daquela entrega.

### Crítico — autorização demasiado ampla no Storage
A policy `customer_read_digital_files` verifica apenas se o utilizador tem alguma entrega válida. Não compara o nome do objeto solicitado com `products.file_path` do produto associado àquela entrega.

**Correção proposta:** autorizar apenas o caminho exato do ficheiro associado à entrega do utilizador, validando limites e expiração. Testar também que uma compra não permite descarregar o ficheiro de outro produto.

### Alto — UPDATE direto em digital_deliveries
A migration concede `SELECT, UPDATE` a `authenticated` e a policy `customer_update_deliveries` permite atualizar a própria entrega. Isso expõe campos de controlo como contagem, limite, expiração e token.

**Correção proposta:** remover UPDATE direto para utilizadores e manter as alterações de contagem numa função controlada no servidor, com validação de titularidade, expiração e limite.

### Alto — uploads de comprovativos sem restrição suficiente
A migration de comprovativos cria uma policy de INSERT para `anon, authenticated` que só verifica o bucket. Não limita o caminho ao pagamento/encomenda nem restringe o tipo e tamanho do ficheiro nesta policy.

**Correção proposta:** desenhar upload com associação verificável à encomenda e limites de MIME/tamanho. Não remover o fluxo atual sem implementar alternativa para convidados, pois isso pode interromper o checkout guest.

### Alto — URL de download incompatível com o token
`AccountDownloadsPage.tsx` constrói uma URL Storage com `?token=${delivery.download_token}`. Esse token da aplicação não é um token de acesso emitido pelo Supabase Storage. A função `increment_download_count` apenas incrementa a contagem; não cria uma URL assinada.

**Correção proposta:** obter uma URL assinada após autorização do ficheiro exato e incrementar a contagem atomicamente no servidor antes de entregar a URL.

## Limitações desta auditoria

- Não foram executados `npm install`, build, testes automatizados ou testes de penetração.
- Não foi inspecionada nem alterada uma base Supabase ligada.
- Não foram aplicadas migrations nem alterados dados de produção.
- O fluxo de convidados exige desenho e teste específico antes de revogar permissões, para evitar bloquear pagamentos ou downloads legítimos.

## Próxima sequência técnica

1. Rever todas as migrations posteriores e os campos que o frontend realmente atualiza.
2. Preparar migrations de segurança com o fluxo guest preservado.
3. Corrigir o frontend para usar downloads temporários autorizados.
4. Rever upload de comprovativos e notificações de login.
5. Executar build e testes antes de abrir Pull Request.
