import { useCallback, useEffect, useState } from "react";
import { getPlatform } from "../platform/index";
import { api, type Pet } from "../services/api";

const PET_KEY = "pli_current_pet";

export type PetContextState = "loading" | "ready" | "error";

/**
 * Current-pet context persisted in platform storage.
 *
 * R5.6 truth rule: a failed /pets request is NOT the same thing as an empty
 * household. Consumers use `state` to keep Loading / Error / Empty distinct.
 */
export function usePets() {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [state, setState] = useState<PetContextState>("loading");

  const choose = useCallback((id: string) => {
    getPlatform().storage.set(PET_KEY, id);
    setPetId(id);
  }, []);

  const refresh = useCallback(() => {
    const p = getPlatform();
    setState("loading");
    api
      .get<Pet[]>("/pets")
      .then((rows) => {
        setPets(rows);
        setState("ready");
        const stored = p.storage.get(PET_KEY);
        if (!rows.length) {
          setPetId(null);
          return;
        }
        if (!stored || !rows.some((row) => row.id === stored)) {
          choose(rows[0].id);
        } else {
          setPetId(stored);
        }
      })
      .catch(() => {
        // Preserve any previously known rows but explicitly mark the pet
        // directory unavailable. Never reinterpret transport failure as empty.
        setState("error");
      });
  }, [choose]);

  useEffect(() => {
    const p = getPlatform();
    setPetId(p.storage.get(PET_KEY));
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pets, petId, choose, refresh, state };
}
