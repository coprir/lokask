// apps/mobile/store/auth.ts
import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase client with secure storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  is_verified: boolean;
  stripe_account_id?: string;
  provider_profiles?: any;
}

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setSession: (session: any) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ session: data.session });
      await get().fetchProfile();
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      set({ session: data.session });
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'lokask://auth/callback' },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  setSession: (session) => {
    set({ session, initialized: true });
    if (session) get().fetchProfile();
  },

  updateUser: (updates) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },

  fetchProfile: async () => {
    const session = get().session;
    if (!session) return;

    const { data } = await supabase
      .from('users')
      .select('*, provider_profiles(*)')
      .eq('id', session.user.id)
      .single();

    if (data) set({ user: data as User, initialized: true });
  },
}));


// ─── API Client ──────────────────────────────────────────────
// apps/mobile/utils/api.ts

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private async getToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Services
  getServices(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/services${qs}`);
  }

  getService(id: string) {
    return this.request<any>(`/services/${id}`);
  }

  createService(data: any) {
    return this.request<any>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Bookings
  getBookings(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/bookings${qs}`);
  }

  createBooking(data: any) {
    return this.request<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateBookingStatus(id: string, data: any) {
    return this.request<any>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Payments
  createPaymentIntent(bookingId: string) {
    return this.request<any>('/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId }),
    });
  }

  getProviderDashboard() {
    return this.request<any>('/payments/provider/dashboard');
  }

  onboardStripeConnect() {
    return this.request<any>('/payments/connect/onboard', { method: 'POST' });
  }

  getConnectStatus() {
    return this.request<any>('/payments/connect/status');
  }

  // Messages
  getConversations() {
    return this.request<any>('/messages/conversations');
  }

  getMessages(conversationId: string, params?: any) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/messages/${conversationId}${qs}`);
  }

  sendMessage(data: any) {
    return this.request<any>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  startConversation(data: any) {
    return this.request<any>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reviews
  createReview(data: any) {
    return this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getReviews(params?: any) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/reviews${qs}`);
  }

  // User
  getMe() {
    return this.request<any>('/users/me');
  }

  updateMe(data: any) {
    return this.request<any>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  getNotifications() {
    return this.request<any>('/notifications');
  }

  markNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'POST' });
  }
}

export const api = new ApiClient();
