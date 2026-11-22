export type UserRole = 'customer' | 'admin';

export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'completed' | 'cancelled';
export type PaymentMethod = 'transfer' | 'reference';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';
export type ProductType = 'own' | 'external';
export type LinkType = 'buy' | 'supplier' | 'demo' | 'docs' | 'presentation';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  file_path: string | null;
  file_name: string | null;
  details: string | null;
  product_type: ProductType;
  supplier_name: string | null;
  external_url: string | null;
  partnership_type: string | null;
  commission: number | null;
  external_product_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  external_links?: ExternalProductLink[];
}

export interface Order {
  id: string;
  customer_id: string | null;
  status: OrderStatus;
  total: number;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  is_guest: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  product?: Product;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  reference: string | null;
  proof_path: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DigitalDelivery {
  id: string;
  order_id: string;
  product_id: string;
  customer_id: string | null;
  download_token: string;
  download_count: number;
  max_downloads: number;
  expires_at: string;
  created_at: string;
  product?: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  is_reported: boolean;
  report_reason: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
}

export interface ExternalProductLink {
  id: string;
  product_id: string;
  link_type: LinkType;
  url: string;
  label: string | null;
  created_at: string;
}
