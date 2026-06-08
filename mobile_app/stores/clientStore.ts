import { create } from 'zustand';
import { DebtClient } from '../shared/types';
import { fetchDebtClients } from '../shared/db';
import { supabase } from '../lib/supabase';

interface ClientState {
  clients: DebtClient[];
  loading: boolean;
  loadClients: (userId: string) => Promise<void>;
  markSettled: (clientId: string, userId: string) => Promise<void>;
  subscribeRealtime: (userId: string) => () => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  loading: false,

  loadClients: async (userId) => {
    set({ loading: true });
    const clients = await fetchDebtClients(userId);
    set({ clients, loading: false });
  },

  markSettled: async (clientId, userId) => {
    await supabase
      .from('debt_clients')
      .update({ status: 'Liquidado' })
      .eq('id', clientId);
    set(state => ({
      clients: state.clients.map(c => c.id === clientId ? { ...c, status: 'Liquidado' } : c),
    }));
    void userId;
  },

  subscribeRealtime: (userId) => {
    const channel = supabase
      .channel('clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debt_clients', filter: `user_id=eq.${userId}` },
        () => get().loadClients(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
}));
