import { useEffect } from 'react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useAuthStore } from '../stores/authStore';

export function useRealtimeInvoices() {
  const user = useAuthStore(s => s.user);
  const { loadAll, subscribeRealtime } = useInvoiceStore();

  useEffect(() => {
    if (!user) return;
    loadAll(user.id);
    const unsub = subscribeRealtime(user.id);
    return unsub;
  }, [user?.id]);
}
