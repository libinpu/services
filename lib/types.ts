export type Language = 'ml' | 'en';

export type UserRole = 'customer' | 'provider' | 'admin';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'awaiting_confirmation'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet';

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export type BookingMode = 'auto' | 'manual';

export type BackgroundCheckStatus = 'pending' | 'approved' | 'rejected';

export interface ServiceZone {
  id: string;
  name: string;
  state: string;
  district: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceCategoryGroup {
  id: string;
  name_en: string;
  name_ml: string;
  icon_name: string;
  color_theme: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name_en: string;
  name_ml: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  group_id: string | null;
  created_at: string;
}

export interface ServiceSubcategory {
  id: string;
  category_id: string;
  name_en: string;
  name_ml: string;
  description_en: string | null;
  description_ml: string | null;
  base_price: number;
  estimated_price_min: number;
  estimated_price_max: number;
  estimated_time_mins: number;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  preferred_language: Language;
  zone_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  id: string;
  category_ids: string[];
  specializations: string[];
  experience_years: number;
  is_verified: boolean;
  background_check_status: BackgroundCheckStatus;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  is_online: boolean;
  price_per_hour: number;
  zone_id: string | null;
  bio_en: string | null;
  bio_ml: string | null;
  id_proof_url: string | null;
  address_proof_url: string | null;
  police_verification_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderWithProfile extends Profile {
  provider_profile: ProviderProfile | null;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address_line: string;
  area: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  is_in_service_zone: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string | null;
  subcategory_id: string;
  address_id: string | null;
  zone_id: string | null;
  status: BookingStatus;
  scheduled_at: string | null;
  booking_mode: BookingMode;
  estimated_cost: number;
  final_cost: number | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  otp: string | null;
  otp_verified: boolean;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingItem {
  id: string;
  booking_id: string;
  description_en: string;
  description_ml: string | null;
  amount: number;
  is_approved_by_customer: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string | null;
  booking_id: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  title_en: string;
  title_ml: string;
  description_en: string | null;
  description_ml: string | null;
  image_url: string | null;
  discount_text_en: string | null;
  discount_text_ml: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface BookingWithDetails extends Booking {
  subcategory: ServiceSubcategory;
  address: Address | null;
  provider: Profile | null;
  booking_items: BookingItem[];
  reviews: Review[];
  start_selfie_url: string | null;
  end_selfie_url: string | null;
}

export interface ProviderApplication {
  id: string;
  user_id: string;
  category_ids: string[];
  specializations: string[];
  experience_years: number;
  bio_en: string | null;
  bio_ml: string | null;
  id_proof_url: string | null;
  certificate_url: string | null;
  address_proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
