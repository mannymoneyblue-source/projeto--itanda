# Ĉitanda Assistant — configuração

O assistente é apresentado apenas a clientes autenticados. A interface chama a Edge Function `citanda-assistant`, que valida a sessão do Supabase, consulta apenas o catálogo público de produtos e envia o contexto limitado para a API da OpenAI.

## Configurar a chave de IA

1. Crie uma chave de API numa conta OpenAI administrada pelo responsável adulto pela plataforma.
2. Abra o projeto Supabase `qsutjbdrjqemgwigjwws`.
3. Vá a **Edge Functions → Secrets**.
4. Adicione `OPENAI_API_KEY` com a chave. Nunca coloque esta chave em variáveis `VITE_*), no frontend ou no GitHub.
5. Opcionalmente, configure `OPENAI_MODEL` (por omissão: `gpt-4o-mini`).
6. Opcionalmente, configure `ASSISTANT_ALLOWED_ORIGIN` com o domínio exato da loja para restringir CORS.

## Deploy

A função encontra-se em `supabase/functions/citanda-assistant/index.ts` e deve ser publicada com a verificação JWT ativa (`verify_jwt = true`). O assistente valida novamente a sessão e exige um perfil com o papel `customer`.

## Limites e comportamento

- Máximo de 10 mensagens por pedido, 1.500 caracteres por mensagem e 350 tokens por resposta.
- O contexto do catálogo é limitado a 15 produtos ativos.
- O bot não executa compras, pagamentos, cancelamentos ou alterações de encomendas.
- Não inventa stock, prazos, portes, políticas ou métodos de pagamento.
- Não recolhe palavras-passe, códigos de autenticação ou dados completos de cartões.
- A conversa permanece no estado do navegador; não é guardado histórico no banco de dados nesta primeira versão.

Antes de ativar para todos os clientes, testar com uma conta de cliente e confirmar os custos/limites de utilização da API.
