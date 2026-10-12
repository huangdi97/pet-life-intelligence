/** Current-pet context persisted in secure storage (GOAL Phase 10:
 *  永远显示当前 Pet). Shared across all tabs and stack screens. */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, type Pet } from "./api";
import { getCurrentPet, setCurrentPet } from "./storage/session";

interface PetsContextValue {
  pets: Pet[] | null;
  petId: string | null;
  choose: (id: string) => Promise<void>;
  reload: () => void;
  /** Clear in-memory pets after logout so screens cannot show stale data. */
  reset: () => void;
}

const PetsContext = createContext<PetsContextValue | null>(null);

export function PetsProvider({ children, deferInitialLoad = false }: { children: React.ReactNode; deferInitialLoad?: boolean }) {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // A current-session owner selection is authoritative over an asynchronous
  // SecureStore read from before a relaunch or demo login.
  const selectedInSession = useRef<string | null>(null);
  // Persist rapid A→B→A selections in invocation order, not I/O completion
  // order. Otherwise the next launch can resurrect the wrong pet.
  const persistQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    // Demo evidence must authenticate before any pet requests are issued.
    // Production still loads on mount. The demo gate calls reload() after login.
    if (deferInitialLoad && tick === 0) return;
    let alive = true;
    api
      .get<Pet[]>("/pets")
      .then(async (rows) => {
        if (!alive) return;
        setPets(rows);
        const stored = await getCurrentPet();
        if (!alive) return;
        // choose() may have run while /pets and SecureStore were pending.
        // Never overwrite its in-memory selection with a stale storage read.
        const preferred = selectedInSession.current ?? stored;
        if (rows.length && (!preferred || !rows.some((r) => r.id === preferred))) {
          const first = rows[0].id;
          selectedInSession.current = first;
          setPetId(first);
          const write = persistQueue.current.then(() => setCurrentPet(first));
          persistQueue.current = write.catch(() => {});
          await write;
        } else {
          setPetId(preferred);
        }
      })
      .catch(() => {
        if (alive) setPets([]);
      });
    return () => {
      alive = false;
    };
  }, [tick, deferInitialLoad]);

  const choose = useCallback(async (id: string) => {
    selectedInSession.current = id;
    setPetId(id);
    const write = persistQueue.current.then(() => setCurrentPet(id));
    persistQueue.current = write.catch(() => {});
    await write;
  }, []);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const reset = useCallback(() => {
    selectedInSession.current = null;
    setPets(null);
    setPetId(null);
  }, []);

  return <PetsContext.Provider value={{ pets, petId, choose, reload, reset }}>{children}</PetsContext.Provider>;
}

export function usePets(): PetsContextValue {
  const ctx = useContext(PetsContext);
  if (!ctx) throw new Error("usePets 必须在 PetsProvider 内使用");
  return ctx;
}
