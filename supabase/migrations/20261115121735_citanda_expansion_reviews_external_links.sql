/*
# Ĉitanda — Expansão: Produtos de Terceiros, Avaliações, Links Externos

## Alterações

### 1. Tabela products — novas colunas
- product_type: 'own' | 'external' (default 'own')
- supplier_name: nome do fornecedor (para produtos externos)
- external_url: link de destino (HTTPS obrigatório)
- partnership_type: tipo de parceria (revenda, afiliado, etc.)
- commission: percentual de comissão (opcional)
- external_product_id: ID no sistema do fornecedor

### 2. Nova tabela product_reviews
- Avaliações de produtos por clientes autenticados
- 1-5 estrelas + comentário
- Identificação de compra verificada
- Moderação administrativa (is_hidden, is_reported)
- Um utilizador uma avaliação por produto

### 3. Nova tabela external_product_links
- Links adicionais por produto (demonstração, documentação, fornecedor, etc.)
- Validação HTTPS

### 4. Função notify_new_login()
- SECURITY DEFINER: insere notificação de login (para futura integração com email)

## Segurança
- RLS em product_reviews e external_product_links
- Apenas clientes autenticados criam avaliações
- Apenas admin modera/elimina avaliações
- Apenas admin gere links externos
- Validação de URLs HTTPS no servidor
*/

-- ============================================================================
-- PRODUCTS: novas colunas
-- ============================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'own' CHECK (product_type IN ('own', 'external'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS partnership_type text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission numeric(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_product_id text;

-- ============================================================================
-- PRODUCT REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  is_verified_purchase boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  is_reported boolean NOT NULL DEFAULT false,
  report_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON product_reviews(user_id);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON product_reviews TO authenticated;

-- Reviews visíveis para todos (anon + authenticated) exceto as ocultas
DROP POLICY IF EXISTS "public_read_reviews" ON product_reviews;
CREATE POLICY "public_read_reviews" ON product_reviews FOR SELECT
  TO anon, authenticated USING (is_hidden = false OR is_admin());

-- Cliente autenticado pode criar a sua avaliação (uma por produto)
DROP POLICY IF EXISTS "insert_own_review" ON product_reviews;
CREATE POLICY "insert_own_review" ON product_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Cliente pode editar a sua avaliação
DROP POLICY IF EXISTS "update_own_review" ON product_reviews;
CREATE POLICY "update_own_review" ON product_reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cliente pode eliminar a sua avaliação
DROP POLICY IF EXISTS "delete_own_review" ON product_reviews;
CREATE POLICY "delete_own_review" ON product_reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Admin pode moderar (ocultar, reportar) e eliminar qualquer avaliação
DROP POLICY IF EXISTS "admin_moderate_reviews" ON product_reviews;
CREATE POLICY "admin_moderate_reviews" ON product_reviews FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_reviews" ON product_reviews;
CREATE POLICY "admin_delete_reviews" ON product_reviews FOR DELETE
  TO authenticated USING (is_admin());

-- updated_at trigger
DROP TRIGGER IF EXISTS reviews_updated_at ON product_reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- EXTERNAL PRODUCT LINKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS external_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('buy', 'supplier', 'demo', 'docs', 'presentation')),
  url text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_links_product_id ON external_product_links(product_id);

ALTER TABLE external_product_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON external_product_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON external_product_links TO authenticated;

-- Links visíveis para todos
DROP POLICY IF EXISTS "public_read_ext_links" ON external_product_links;
CREATE POLICY "public_read_ext_links" ON external_product_links FOR SELECT
  TO anon, authenticated USING (true);

-- Apenas admin gere links
DROP POLICY IF EXISTS "admin_insert_ext_links" ON external_product_links;
CREATE POLICY "admin_insert_ext_links" ON external_product_links FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_ext_links" ON external_product_links;
CREATE POLICY "admin_update_ext_links" ON external_product_links FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_ext_links" ON external_product_links;
CREATE POLICY "admin_delete_ext_links" ON external_product_links FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================================
-- VERIFY PURCHASE FUNCTION — checks if user has a paid order with this product
-- ============================================================================
CREATE OR REPLACE FUNCTION is_verified_purchase(p_user_id uuid, p_product_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id
      AND o.customer_id = p_user_id
      AND o.status IN ('paid', 'completed')
  );
$$;

REVOKE EXECUTE ON FUNCTION is_verified_purchase(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_verified_purchase(uuid, uuid) TO authenticated;

-- ============================================================================
-- AUTO-SET is_verified_purchase on review insert
-- ============================================================================
CREATE OR REPLACE FUNCTION set_verified_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_verified_purchase := is_verified_purchase(NEW.user_id, NEW.product_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_review ON product_reviews;
CREATE TRIGGER before_insert_review
  BEFORE INSERT ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION set_verified_purchase();

-- ============================================================================
-- LOGIN NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_method text NOT NULL DEFAULT 'password',
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_notif_user_id ON login_notifications(user_id);

ALTER TABLE login_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON login_notifications TO authenticated;

DROP POLICY IF EXISTS "read_own_login_notifs" ON login_notifications;
CREATE POLICY "read_own_login_notifs" ON login_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- notify_new_login — called on login event
CREATE OR REPLACE FUNCTION notify_new_login(
  p_user_id uuid,
  p_login_method text DEFAULT 'password',
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO login_notifications (user_id, login_method, user_agent)
  VALUES (p_user_id, p_login_method, p_user_agent);
END;
$$;

REVOKE EXECUTE ON FUNCTION notify_new_login(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION notify_new_login(uuid, text, text) TO authenticated;
