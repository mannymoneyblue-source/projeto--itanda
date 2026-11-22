import { supabase } from '@/lib/supabase';
import type { Category, Product, Order, Payment, DigitalDelivery, Profile, ProductReview, ExternalProductLink } from '@/types';

// ---- Categories ----
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Category[];
}

// ---- Products ----
export async function fetchProducts(filters?: {
  categoryId?: string;
  search?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'name' | 'top_rated';
  limit?: number;
  featuredOnly?: boolean;
  productType?: 'own' | 'external';
  minPrice?: number;
  maxPrice?: number;
}): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true);

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters?.featuredOnly) {
    query = query.eq('is_featured', true);
  }
  if (filters?.productType) {
    query = query.eq('product_type', filters.productType);
  }
  if (filters?.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }
  if (filters?.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
  }

  switch (filters?.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    case 'top_rated':
      // Top rated: we'll sort in JS since we need a join/aggregate
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  let result = data as Product[];

  if (filters?.sort === 'top_rated') {
    const reviewsMap = await fetchAverageRatings(result.map((p) => p.id));
    result = result.sort((a, b) => (reviewsMap[b.id]?.avg || 0) - (reviewsMap[a.id]?.avg || 0));
  }

  return result;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function fetchProductExternalLinks(productId: string): Promise<ExternalProductLink[]> {
  const { data, error } = await supabase
    .from('external_product_links')
    .select('*')
    .eq('product_id', productId)
    .order('created_at');
  if (error) throw error;
  return data as ExternalProductLink[];
}

// ---- Reviews ----
export async function fetchProductReviews(productId: string): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const reviews = (data || []) as ProductReview[];
  const names = await fetchReviewerNames([...new Set(reviews.map((r) => r.user_id))]);
  return reviews.map((r) => ({
    ...r,
    reviewer_name: names[r.user_id] || 'Anónimo',
  }));
}

export async function fetchReviewerNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const names: Record<string, string> = {};
  await Promise.all(
    userIds.map(async (id) => {
      const { data, error } = await supabase.rpc('reviewer_name', { p_user_id: id });
      if (!error && typeof data === 'string') names[id] = data;
    })
  );
  return names;
}

export async function fetchAverageRatings(productIds: string[]): Promise<Record<string, { avg: number; count: number }>> {
  if (productIds.length === 0) return {};
  const { data, error } = await supabase
    .from('product_reviews')
    .select('product_id, rating')
    .in('product_id', productIds)
    .eq('is_hidden', false);
  if (error) return {};
  const map: Record<string, { avg: number; count: number }> = {};
  for (const row of data) {
    if (!map[row.product_id]) map[row.product_id] = { avg: 0, count: 0 };
    map[row.product_id].avg += row.rating;
    map[row.product_id].count += 1;
  }
  for (const key of Object.keys(map)) {
    map[key].avg = map[key].count > 0 ? map[key].avg / map[key].count : 0;
  }
  return map;
}

export async function fetchMyReview(productId: string): Promise<ProductReview | null> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) return null;
  return data as ProductReview | null;
}

export async function createReview(productId: string, rating: number, comment: string): Promise<void> {
  const { error } = await supabase
    .from('product_reviews')
    .insert({ product_id: productId, rating, comment });
  if (error) throw error;
}

export async function updateReview(reviewId: string, rating: number, comment: string): Promise<void> {
  const { error } = await supabase
    .from('product_reviews')
    .update({ rating, comment })
    .eq('id', reviewId);
  if (error) throw error;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId);
  if (error) throw error;
}

export async function reportReview(reviewId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('report_review', {
    p_review_id: reviewId,
    p_reason: reason || null,
  });
  if (error) throw error;
}

// ---- Admin: Reviews moderation ----
export async function fetchAllReviews(): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*, product:products(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const reviews = (data || []) as ProductReview[];
  const names = await fetchReviewerNames([...new Set(reviews.map((r) => r.user_id))]);
  return reviews.map((r) => ({
    ...r,
    reviewer_name: names[r.user_id] || 'Anónimo',
  }));
}

export async function moderateReview(reviewId: string, action: 'hide' | 'show' | 'report', reason?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_moderate_review', {
    p_review_id: reviewId,
    p_action: action,
    p_reason: reason || null,
  });
  if (error) throw error;
}

// ---- Admin: External links ----
export async function createExternalLink(productId: string, linkType: string, url: string, label?: string): Promise<void> {
  const { error } = await supabase
    .from('external_product_links')
    .insert({ product_id: productId, link_type: linkType, url, label: label || null });
  if (error) throw error;
}

export async function deleteExternalLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('external_product_links')
    .delete()
    .eq('id', linkId);
  if (error) throw error;
}

// ---- Orders ----
export async function createOrder(params: {
  items: { product_id: string; quantity: number }[];
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  notes?: string;
  is_guest: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_order', {
    p_items: JSON.stringify(params.items),
    p_customer_email: params.customer_email,
    p_customer_name: params.customer_name,
    p_customer_phone: params.customer_phone || null,
    p_notes: params.notes || null,
    p_is_guest: params.is_guest,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchMyOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), payments(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(*)), payments(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export async function createPayment(params: {
  order_id: string;
  method: 'transfer' | 'reference';
  amount: number;
  reference?: string;
}): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      order_id: params.order_id,
      method: params.method,
      amount: params.amount,
      reference: params.reference || null,
      status: 'pending',
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Payment | null;
}

export async function uploadPaymentProof(file: File, orderId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  return path;
}

export async function attachPaymentProof(paymentId: string, proofPath: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({ proof_path: proofPath })
    .eq('id', paymentId);
  if (error) throw error;
}

export async function getPaymentProofUrl(proofPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(proofPath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function rejectPayment(paymentId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('reject_payment', {
    p_payment_id: paymentId,
    p_reason: reason || null,
  });
  if (error) throw error;
}

// ---- Digital Deliveries ----
export async function fetchMyDeliveries(): Promise<DigitalDelivery[]> {
  const { data, error } = await supabase
    .from('digital_deliveries')
    .select('*, product:products(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as DigitalDelivery[];
}

export async function incrementDownload(deliveryId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_download_count', { p_delivery_id: deliveryId });
  if (error) throw error;
}

// ---- Profile ----
export async function updateProfile(updates: {
  full_name?: string;
  phone?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.full_name,
      phone: updates.phone,
    })
    .eq('id', user.id);
  if (error) throw error;
}

// ---- Admin: Products ----
export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function createProduct(params: {
  name: string;
  slug: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  details: string | null;
  file_path: string | null;
  file_name: string | null;
  product_type?: string;
  supplier_name?: string | null;
  external_url?: string | null;
  partnership_type?: string | null;
  commission?: number | null;
  external_product_id?: string | null;
}): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert(params)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---- Admin: Orders ----
export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(*)), payments(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function confirmPayment(paymentId: string, reference?: string, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_payment', {
    p_payment_id: paymentId,
    p_reference: reference || null,
    p_notes: notes || null,
  });
  if (error) throw error;
}

// ---- Admin: Customers ----
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Profile[];
}

// ---- Admin: Dashboard ----
export async function fetchDashboardStats(): Promise<{
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  activeProducts: number;
}> {
  const [paidOrders, allOrders, pendingOrders, customers, products] = await Promise.all([
    supabase.from('orders').select('total').in('status', ['paid', 'completed']),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed']),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const totalSales = (paidOrders.data || []).reduce((sum, o) => sum + (o.total || 0), 0);

  return {
    totalSales,
    totalOrders: allOrders.count || 0,
    pendingOrders: pendingOrders.count || 0,
    totalCustomers: customers.count || 0,
    activeProducts: products.count || 0,
  };
}
