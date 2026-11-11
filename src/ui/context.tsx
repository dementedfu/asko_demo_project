import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Actor } from "../domain/model";
type Session = Actor;
type Toast = { text: string; error: boolean } | null;
interface ContextValue {
  session: Session;
  setSession: (s: Session) => void;
  busy: boolean;
  notify: (text: string, error?: boolean) => void;
  run: <T>(job: () => Promise<T>, success?: string) => Promise<T | undefined>;
  registerBeforeLeave: (guard: () => Promise<void>) => () => void;
  leave: () => Promise<boolean>;
}
const Context = createContext<ContextValue | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("App context missing");
  return value;
}
function readSession(): Session {
  try {
    const s = JSON.parse(localStorage.getItem("dp-session") ?? "null");
    if (
      s &&
      ["client", "master"].includes(s.role) &&
      ["anna", "mikhail", "olga"].includes(s.clientId)
    )
      return s;
  } catch {}
  return { role: "client", clientId: "anna" };
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const beforeLeave = useRef<(() => Promise<void>) | undefined>(undefined);
  const registerBeforeLeave = useCallback((guard: () => Promise<void>) => {
    beforeLeave.current = guard;
    return () => {
      if (beforeLeave.current === guard) beforeLeave.current = undefined;
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("dp-session", JSON.stringify(session));
    } catch {}
  }, [session]);
  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );
  const run = useCallback(
    async <T,>(job: () => Promise<T>, success?: string) => {
      setPending((n) => n + 1);
      try {
        const result = await job();
        if (success) notify(success);
        return result;
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить. Попробуйте ещё раз.",
          true,
        );
        return undefined;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [notify],
  );
  const leave = useCallback(async () => {
    try {
      await beforeLeave.current?.();
      return true;
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Изменения не сохранены",
        true,
      );
      return false;
    }
  }, [notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <Context.Provider
      value={{
        session,
        setSession,
        busy: pending > 0,
        notify,
        run,
        registerBeforeLeave,
        leave,
      }}
    >
      {children}
      {toast && (
        <div
          className={"toast " + (toast.error ? "toast-error" : "")}
          role={toast.error ? "alert" : "status"}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            aria-label="Закрыть уведомление"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
