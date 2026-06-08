import { useEffect } from 'react';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';

export function useRealtimeClients() {
  const user = useAuthStore(s => s.user);
  const { loadClients, subscribeRealtime } = useClientStore();

  useEffect(() => {
    if (!user) return;
    loadClients(user.id);
    const unsub = subscribeRealtime(user.id);
    return unsub;
  }, [user?.id]);
}
