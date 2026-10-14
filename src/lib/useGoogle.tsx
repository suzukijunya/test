import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { signIn, signOut, type GoogleToken } from './googleCalendar';
import { useStore } from '../store';

interface GoogleState {
  token: GoogleToken | null;
  error: string;
  busy: boolean;
  connect: () => Promise<GoogleToken | null>;
  disconnect: () => void;
  /** トークンが無い/期限切れならログインしてから返す */
  ensureToken: () => Promise<GoogleToken | null>;
}

const Ctx = createContext<GoogleState | null>(null);

export function GoogleProvider({ children }: { children: ReactNode }) {
  const { data } = useStore();
  const [token, setToken] = useState<GoogleToken | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const clientId = data.settings.googleClientId.trim();

  const connect = useCallback(async () => {
    if (!clientId) {
      setError('設定画面で Google OAuth クライアントID を入力してください');
      return null;
    }
    setBusy(true);
    setError('');
    try {
      const t = await signIn(clientId);
      setToken(t);
      return t;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, [clientId]);

  const ensureToken = useCallback(async () => {
    if (token && token.expiresAt - 60_000 > Date.now()) return token;
    return connect();
  }, [token, connect]);

  const disconnect = useCallback(() => {
    if (token) signOut(token);
    setToken(null);
  }, [token]);

  return (
    <Ctx.Provider value={{ token, error, busy, connect, disconnect, ensureToken }}>{children}</Ctx.Provider>
  );
}

export function useGoogle(): GoogleState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGoogle must be used inside GoogleProvider');
  return v;
}
