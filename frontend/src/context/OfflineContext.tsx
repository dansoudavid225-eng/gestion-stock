'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getPendingSales, syncPendingSales } from '@/lib/offline';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  sync: () => Promise<number>;
  lastSync: Date | null;
}

const OfflineContext = createContext<OfflineContextType>({} as OfflineContextType);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const updatePending = useCallback(() => {
    setPendingCount(getPendingSales().filter((s) => !s.synced).length);
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    updatePending();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', updatePending);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', updatePending);
    };
  }, [updatePending]);

  const sync = useCallback(async () => {
    setSyncing(true);
    const count = await syncPendingSales();
    updatePending();
    setSyncing(false);
    setLastSync(new Date());
    return count;
  }, [updatePending]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncing, sync, lastSync }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
