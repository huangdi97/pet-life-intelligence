/** Current-pet context persisted in secure storage (GOAL Phase 10:
 *  永远显示当前 Pet). Shared across all tabs and stack screens. */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get<Pet[]>("/pets")
      .then(async (rows) => {
        if (!alive) return;
        setPets(rows);
        const stored = await getCurrentPet();
        if (rows.length && (!stored || !rows.some((r) => r.id === stored))) {
          const first = rows[0].id;
          setPetId(first);
          await setCurrentPet(first);
        } else {
          setPetId(stored);
        }
      })
      .catch(() => {
        if (alive) setPets([]);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const choose = useCallback(async (id: string) => {
    setPetId(id);
    await setCurrentPet(id);
  }, []);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const reset = useCallback(() => {
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
