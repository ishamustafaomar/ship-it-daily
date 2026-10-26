import { useEffect, useRef, useState } from "react";
import { draftKey, emptyDraft, hasDraft, parseDraft, persistDraft, type ComposerDraft } from "@/lib/composer-draft";

export function useComposerDraft(userId: string, parentShipId: string | null) {
  const key = draftKey(userId, parentShipId);
  const [draft, setDraft] = useState<ComposerDraft>(emptyDraft);
  const current = useRef(draft);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let restored = emptyDraft();
    try {
      restored = parseDraft(window.localStorage.getItem(key));
      setSaved(hasDraft(restored));
    } catch {
      setSaved(false);
    }
    current.current = restored;
    setDraft(restored);
    setLoadedKey(key);
  }, [key]);

  function update(patch: Partial<ComposerDraft>) {
    if (loadedKey !== key) return;
    const next = { ...current.current, ...patch };
    current.current = next;
    setDraft(next);
    try {
      persistDraft(window.localStorage, key, next);
      setSaved(hasDraft(next));
    } catch {
      setSaved(false);
    }
  }

  useEffect(() => {
    if (saved || !hasDraft(draft)) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft, saved]);

  return { draft, update, clear: () => update(emptyDraft()), ready: loadedKey === key, saved };
}