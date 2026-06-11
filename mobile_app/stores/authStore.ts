import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  loading: boolean;
  setUser: (id: string | null, email: string | null, name?: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  userEmail: null,
  userName: null,
  loading: true,

  setUser: (id, email, name) => set({ userId: id, userEmail: email, userName: name }),

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        userName: session.user.user_metadata?.full_name ?? null,
        loading: false,
      });
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          userId: session.user.id,
          userEmail: session.user.email ?? null,
          userName: session.user.user_metadata?.full_name ?? null,
        });
      } else {
        set({ userId: null, userEmail: null, userName: null });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ userId: null, userEmail: null, userName: null });
  },
}));
