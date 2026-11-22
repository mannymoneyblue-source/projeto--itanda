/*
# Ĉitanda — Esquema Inicial da Base de Dados

## Descrição Geral
Cria a estrutura relacional completa para a plataforma Ĉitanda, uma loja de produtos digitais
para o mercado angolano. Inclui perfis de utilizador, categorias, produtos, encomendas,
itens de encomenda, pagamentos e entregas digitais.

## Tabelas Criadas

1. **profiles** — Estende auth.users com nome completo, role (customer/admin), telefone.
   - Trigger automático cria perfil ao registar utilizador.
   - Role tem default 'customer' — impossível tornar-se admin via registo público.

2. **categories** — Categorias de produtos (nome, slug, descrição).

3. **products** — Produtos digitais com preço em Kz, imagem, ficheiro associado,
   estado ativo/destaque, detalhes. Preço armazenado como integer (kwanza inteiro).

4. **orders** — Encomendas com estado, total, dados do cliente (conta ou convidado),
   notas. Total calculado no servidor via função.

5. **order_items** — Itens de cada encomenda com referência ao produto, preço snapshot,
   quantidade e subtotal.

6. **payments** — Pagamentos associados a encomendas. Método (transferência/referência),
   estado (pendente/confirmado/rejeitado), referência, confirmação por admin.

7. **digital_deliveries** — Entregas digitais com token único, contagem de downloads,
   limite e expiração. Só disponível quando pagamento confirmado.

8. **admin_audit_log** — Registo de ações administrativas importantes.

## Segurança — RLS em todas as tabelas

- profiles: Utilizador lê/atualiza próprio perfil. Admin lê todos.
- categories: Leitura pública. Escrita só admin.
- products: Leitura pública de ativos. Admin gerencia tudo.
- orders: Cliente vê próprias encomendas. Admin vê todas.
- order_items: Acesso via encomenda pai.
- payments: Cliente vê pagamentos das suas encomendas. Admin vê e atualiza todos.
- digital_deliveries: Cliente vê suas entregas. Admin vê todas.
- admin_audit_log: Só admin lê.

## Funções

- handle_new_user(): Trigger cria perfil no registo.
- is_admin(): Verifica role admin (SECURITY DEFINER).
- create_order(): Cria encomenda validando preços no servidor.
- confirm_payment(): Admin confirma pagamento, gera entregas digitais.
- log_admin_action(): Regista ação administrativa.

## Storage

- Bucket público "product-images" para imagens.
- Bucket privado "digital-files" para ficheiros pagos.
*/

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON profiles TO authenticated;

-- is_admin helper — SECURITY DEFINER so it can read profiles regardless of RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Profile policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON categories TO authenticated;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================================
-- PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  file_path text,
  file_name text,
  file_size bigint,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON products TO authenticated;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT
  TO anon, authenticated USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "admin_insert_products" ON products;
CREATE POLICY "admin_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'completed', 'cancelled')),
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  customer_email text NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text,
  is_guest boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT INSERT ON orders TO anon;

DROP POLICY IF EXISTS "customer_read_orders" ON orders;
CREATE POLICY "customer_read_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = customer_id OR is_admin());

DROP POLICY IF EXISTS "customer_insert_orders" ON orders;
CREATE POLICY "customer_insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

DROP POLICY IF EXISTS "guest_insert_orders" ON orders;
CREATE POLICY "guest_insert_orders" ON orders FOR INSERT
  TO anon WITH CHECK (customer_id IS NULL);

DROP POLICY IF EXISTS "admin_update_orders" ON orders;
CREATE POLICY "admin_update_orders" ON orders FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal integer NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON order_items TO authenticated;
GRANT INSERT ON order_items TO anon;

DROP POLICY IF EXISTS "read_order_items" ON order_items;
CREATE POLICY "read_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (o.customer_id = auth.uid() OR is_admin() OR o.customer_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "insert_order_items" ON order_items;
CREATE POLICY "insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND (o.customer_id = auth.uid() OR is_admin())
    )
  );

DROP POLICY IF EXISTS "guest_insert_order_items" ON order_items;
CREATE POLICY "guest_insert_order_items" ON order_items FOR INSERT
  TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.customer_id IS NULL
    )
  );

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'transfer' CHECK (method IN ('transfer', 'reference')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0),
  reference text,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT, INSERT ON payments TO anon;
GRANT UPDATE ON payments TO authenticated;

DROP POLICY IF EXISTS "customer_read_payments" ON payments;
CREATE POLICY "customer_read_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
      AND (o.customer_id = auth.uid() OR is_admin())
    )
  );

DROP POLICY IF EXISTS "anon_read_guest_payments" ON payments;
CREATE POLICY "anon_read_guest_payments" ON payments FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id AND o.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS "customer_insert_payments" ON payments;
CREATE POLICY "customer_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
      AND (o.customer_id = auth.uid() OR is_admin())
    )
  );

DROP POLICY IF EXISTS "guest_insert_payments" ON payments;
CREATE POLICY "guest_insert_payments" ON payments FOR INSERT
  TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id AND o.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS "admin_update_payments" ON payments;
CREATE POLICY "admin_update_payments" ON payments FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- DIGITAL DELIVERIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS digital_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  download_token text NOT NULL UNIQUE,
  download_count integer NOT NULL DEFAULT 0,
  max_downloads integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON digital_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON digital_deliveries(customer_id);

ALTER TABLE digital_deliveries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON digital_deliveries TO authenticated;
GRANT SELECT ON digital_deliveries TO anon;

DROP POLICY IF EXISTS "customer_read_deliveries" ON digital_deliveries;
CREATE POLICY "customer_read_deliveries" ON digital_deliveries FOR SELECT
  TO authenticated USING (auth.uid() = customer_id OR is_admin());

DROP POLICY IF EXISTS "anon_read_deliveries" ON digital_deliveries;
CREATE POLICY "anon_read_deliveries" ON digital_deliveries FOR SELECT
  TO anon USING (customer_id IS NULL);

DROP POLICY IF EXISTS "customer_update_deliveries" ON digital_deliveries;
CREATE POLICY "customer_update_deliveries" ON digital_deliveries FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id OR is_admin());

-- ============================================================================
-- ADMIN AUDIT LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON admin_audit_log TO authenticated;

DROP POLICY IF EXISTS "admin_read_audit" ON admin_audit_log;
CREATE POLICY "admin_read_audit" ON admin_audit_log FOR SELECT
  TO authenticated USING (is_admin());

-- log_admin_action — SECURITY DEFINER so it can insert into audit log
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_target_table text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem registar ações';
  END IF;
  INSERT INTO admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (auth.uid(), p_action, p_target_table, p_target_id, p_details);
END;
$$;

REVOKE EXECUTE ON FUNCTION log_admin_action(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION log_admin_action(text, text, uuid, jsonb) TO authenticated;

-- ============================================================================
-- create_order — SECURITY DEFINER: validates prices server-side
-- ============================================================================
CREATE OR REPLACE FUNCTION create_order(
  p_items jsonb,
  p_customer_email text,
  p_customer_name text DEFAULT '',
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_guest boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_subtotal integer;
  v_total integer := 0;
  v_customer_id uuid := NULL;
BEGIN
  IF NOT p_is_guest THEN
    v_customer_id := auth.uid();
  END IF;

  INSERT INTO orders (customer_id, status, total, customer_email, customer_name, customer_phone, is_guest, notes)
  VALUES (v_customer_id, 'pending', 0, p_customer_email, p_customer_name, p_customer_phone, p_is_guest, p_notes)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não encontrado ou inativo: %', v_item->>'product_id';
    END IF;

    v_subtotal := v_product.price * ((v_item->>'quantity')::integer);
    v_total := v_total + v_subtotal;

    INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.price, (v_item->>'quantity')::integer, v_subtotal);
  END LOOP;

  UPDATE orders SET total = v_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_order(jsonb, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_order(jsonb, text, text, text, text, boolean) TO authenticated, anon;

-- ============================================================================
-- confirm_payment — SECURITY DEFINER: admin confirms payment + creates deliveries
-- ============================================================================
CREATE OR REPLACE FUNCTION confirm_payment(
  p_payment_id uuid,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_order orders%ROWTYPE;
  v_item order_items%ROWTYPE;
  v_token text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem confirmar pagamentos';
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  UPDATE payments
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now(),
      reference = COALESCE(p_reference, reference),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_payment_id;

  UPDATE orders
  SET status = 'paid', updated_at = now()
  WHERE id = v_payment.order_id;

  SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id;

  FOR v_item IN SELECT * FROM order_items WHERE order_id = v_order.id
  LOOP
    v_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO digital_deliveries (order_id, product_id, customer_id, download_token, max_downloads, expires_at)
    VALUES (v_order.id, v_item.product_id, v_order.customer_id, v_token, 5, now() + interval '30 days');
  END LOOP;

  INSERT INTO admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (auth.uid(), 'confirm_payment', 'payments', p_payment_id, jsonb_build_object('order_id', v_order.id));
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION confirm_payment(uuid, text, text) TO authenticated;

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-files', 'digital-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "admin_write_product_images" ON storage.objects;
CREATE POLICY "admin_write_product_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'product-images' AND is_admin());

DROP POLICY IF EXISTS "admin_update_product_images" ON storage.objects;
CREATE POLICY "admin_update_product_images" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'product-images' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_product_images" ON storage.objects;
CREATE POLICY "admin_delete_product_images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'product-images' AND is_admin());

DROP POLICY IF EXISTS "admin_write_digital_files" ON storage.objects;
CREATE POLICY "admin_write_digital_files" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'digital-files' AND is_admin());

DROP POLICY IF EXISTS "admin_update_digital_files" ON storage.objects;
CREATE POLICY "admin_update_digital_files" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'digital-files' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_digital_files" ON storage.objects;
CREATE POLICY "admin_delete_digital_files" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'digital-files' AND is_admin());

DROP POLICY IF EXISTS "customer_read_digital_files" ON storage.objects;
CREATE POLICY "customer_read_digital_files" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'digital-files' AND EXISTS (
      SELECT 1 FROM digital_deliveries d
      WHERE d.customer_id = auth.uid()
      AND d.download_count < d.max_downloads
      AND d.expires_at > now()
    )
  );
