import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Autenticação necessária.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Configuração de ambiente incompleta na função de download.');
    return jsonResponse({ error: 'Serviço temporariamente indisponível.' }, 500);
  }

  const accessToken = authorization.slice('Bearer '.length).trim();
  if (!accessToken) {
    return jsonResponse({ error: 'Autenticação necessária.' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser(accessToken);
  if (authError || !userData.user) {
    return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
  }

  let body: { delivery_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Pedido inválido.' }, 400);
  }

  const deliveryId = body.delivery_id;
  if (typeof deliveryId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deliveryId)) {
    return jsonResponse({ error: 'Entrega inválida.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: delivery, error: deliveryError } = await admin
    .from('digital_deliveries')
    .select('id, customer_id, download_count, max_downloads, expires_at, product:products(file_path, file_name)')
    .eq('id', deliveryId)
    .eq('customer_id', userData.user.id)
    .maybeSingle();

  if (deliveryError) {
    console.error('Falha ao consultar entrega:', deliveryError.message);
    return jsonResponse({ error: 'Não foi possível validar a entrega.' }, 500);
  }
  if (!delivery) {
    return jsonResponse({ error: 'Entrega não encontrada.' }, 404);
  }

  const product = Array.isArray(delivery.product) ? delivery.product[0] : delivery.product;
  if (!product?.file_path) {
    return jsonResponse({ error: 'O ficheiro deste produto não está disponível.' }, 404);
  }
  if (new Date(delivery.expires_at).getTime() <= Date.now()) {
    return jsonResponse({ error: 'O prazo desta entrega terminou.' }, 410);
  }
  if (delivery.download_count >= delivery.max_downloads) {
    return jsonResponse({ error: 'O limite de downloads foi atingido.' }, 410);
  }

  const { data: signedData, error: signedError } = await admin.storage
    .from('digital-files')
    .createSignedUrl(product.file_path, 60, { download: product.file_name || true });
  if (signedError || !signedData?.signedUrl) {
    console.error('Falha ao assinar ficheiro:', signedError?.message);
    return jsonResponse({ error: 'Não foi possível preparar o ficheiro.' }, 500);
  }

  // Compare-and-set: apenas um pedido concorrente com este contador pode avançar.
  const { data: claimed, error: claimError } = await admin
    .from('digital_deliveries')
    .update({ download_count: delivery.download_count + 1 })
    .eq('id', delivery.id)
    .eq('customer_id', userData.user.id)
    .eq('download_count', delivery.download_count)
    .lt('download_count', delivery.max_downloads)
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .maybeSingle();

  if (claimError) {
    console.error('Falha ao registar download:', claimError.message);
    return jsonResponse({ error: 'Não foi possível registar o download.' }, 500);
  }
  if (!claimed) {
    return jsonResponse({ error: 'A entrega foi atualizada ou já não está disponível. Atualiza a página.' }, 409);
  }

  return jsonResponse({ signedUrl: signedData.signedUrl, expiresIn: 60 });
});
