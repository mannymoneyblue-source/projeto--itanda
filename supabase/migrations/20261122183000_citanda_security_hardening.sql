/*
  Ĉitanda — hardening de permissões de perfil e entregas digitais

  Esta migration fecha permissões excessivas identificadas na auditoria.
  Não implementa o fluxo de download para convidados: esse fluxo deverá ser
  migrado para uma Edge Function que valide um token individual e emita
  uma signed URL de curta duração antes de remover qualquer dependência
  legítima de convidados.
*/

BEGIN;

-- Perfis: o cliente só pode alterar os campos comuns do próprio perfil.
-- A coluna role nunca deve ser atualizável pelo cliente.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON TABLE public.profiles TO authenticated;

-- Entregas: não expor tokens de download de encomendas guest por Data API.
REVOKE SELECT ON TABLE public.digital_deliveries FROM anon;
DROP POLICY IF EXISTS "anon_read_deliveries" ON public.digital_deliveries;

-- Impedir que clientes alterem contadores, limites, tokens ou expiração.
REVOKE UPDATE ON TABLE public.digital_deliveries FROM authenticated;
DROP POLICY IF EXISTS "customer_update_deliveries" ON public.digital_deliveries;

-- Storage: o utilizador só pode ler o caminho exato do ficheiro do produto
-- ligado a uma entrega sua que ainda esteja válida e dentro do limite.
DROP POLICY IF EXISTS "customer_read_digital_files" ON storage.objects;
CREATE POLICY "customer_read_digital_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-files'
  AND EXISTS (
    SELECT 1
    FROM public.digital_deliveries AS d
    JOIN public.products AS p ON p.id = d.product_id
    WHERE d.customer_id = (SELECT auth.uid())
      AND p.file_path = storage.objects.name
      AND d.download_count < d.max_downloads
      AND d.expires_at > now()
  )
);

COMMIT;
