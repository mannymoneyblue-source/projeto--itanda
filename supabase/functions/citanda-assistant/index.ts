import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ASSISTANT_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Inicia sessão para utilizar o assistente." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Serviço temporariamente indisponível." }, 503);
    if (!openAiKey) return json({ error: "O serviço de IA ainda não está configurado." }, 503);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Sessão inválida. Inicia sessão novamente." }, 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "customer") {
      return json({ error: "Este assistente está disponível para contas de cliente." }, 403);
    }

    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 10) {
      return json({ error: "Conversa inválida." }, 400);
    }

    const messages: ChatMessage[] = body.messages.map((message: unknown) => {
      if (!message || typeof message !== "object") throw new Error("Mensagem inválida.");
      const item = message as Record<string, unknown>;
      if (item.role !== "user" && item.role !== "assistant") throw new Error("Papel de mensagem inválido.");
      if (typeof item.content !== "string" || !item.content.trim() || item.content.length > 1500) {
        throw new Error("Mensagem demasiado longa ou vazia.");
      }
      return { role: item.role, content: item.content.trim() };
    });

    if (messages[messages.length - 1].role !== "user") {
      return json({ error: "A última mensagem deve ser do cliente." }, 400);
    }

    const { data: products } = await supabase
      .from("products")
      .select("name, description, price, slug, categories(name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(15);

    const catalog = (products ?? []).map((product: Record<string, unknown>) => ({
      name: product.name,
      description: product.description,
      price: product.price,
      slug: product.slug,
      category: product.categories,
    }));

    const systemPrompt = `És o assistente virtual oficial do Ĉitanda, um marketplace digital.
Responde sempre em português claro, educado e conciso. Ajuda os clientes a compreender a plataforma e a descobrir produtos.
Usa exclusivamente o catálogo fornecido para afirmar que um produto existe, o seu preço ou categoria. Nunca inventes stock, descontos, prazos, custos de entrega, políticas de reembolso ou métodos de pagamento.
Quando não tiveres informação confirmada, explica isso e recomenda que o cliente contacte o suporte através da página de contacto.
Não peças palavras-passe, códigos de autenticação, dados completos de cartões ou outras credenciais.
Não afirmes que realizaste compras, pagamentos, cancelamentos ou alterações de encomendas. Não tens autorização para executar essas ações.
Para recomendar um produto, indica o nome e preço do catálogo e, quando útil, o caminho /produto/ seguido do slug.
Catálogo atual (dados da plataforma): ${JSON.stringify(catalog)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI request failed:", response.status);
      return json({ error: "O assistente está temporariamente indisponível. Tenta novamente." }, 502);
    }

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return json({ error: "Não foi possível gerar uma resposta." }, 502);
    }

    return json({ reply: reply.trim() });
  } catch (error) {
    console.error("citanda-assistant error:", error);
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 400);
  }
});
