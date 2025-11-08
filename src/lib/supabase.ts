import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qroqygbculbfqkbinqmp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3F5Z2JjdWxiZnFrYmlucW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDUzNzYsImV4cCI6MjA3NTUyMTM3Nn0.C7fui8NfcJhY77ZTjtbxkCWsUimWFdD4MWEoIkXU7Zg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Driver = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  company_id: string | null;
  status: 'active' | 'inactive';
  fcm_token: string | null;
  created_at: string;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  vehicle_plate?: string | null;
  license_number?: string | null;
  iban?: string | null;
  bic?: string | null;
};

export type Course = {
  id: string;
  driver_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  departure_location: string;
  destination_location: string;
  pickup_date: string;
  status: 'pending' | 'dispatched' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  client_price: number;
  commission: number | null;
  net_driver: number | null;
  passengers_count: number;
  luggage_count: number;
  vehicle_type: string;
  notes: string | null;
  dispatch_mode: string | null;
  flight_number: string | null;
  company_name: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  arrived_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
};

export type DriverNotification = {
  id: string;
  driver_id: string;
  course_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data: Record<string, any> | null;
};

export type AppRole = 'driver' | 'fleet_manager';

export type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};
