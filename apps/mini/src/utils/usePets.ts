import { useCallback, useEffect, useState } from "react";
import { getPlatform } from "../platform/index";
import { api, type Pet } from "../services/api";

const PET_KEY = "pli_current_pet";

/** Current-pet context persisted in platform storage. */
export function usePets() {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState<string | null>(null);

  useEffect(() => {
    const p = getPlatform();
    setPetId(p.storage.get(PET_KEY));
    api
      .get<Pet[]>("/pets")
      .then((rows) => {
        setPets(rows);
        const stored = p.storage.get(PET_KEY);
        if (rows.length && (!stored || !rows.some((r) => r.id === stored))) {
          choose(rows[0].id);
        }
      })
      .catch(() => setPets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = useCallback((id: string) => {
    getPlatform().storage.set(PET_KEY, id);
    setPetId(id);
  }, []);

  return { pets, petId, choose };
}