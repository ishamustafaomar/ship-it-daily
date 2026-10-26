export type ComposerDraft = {
  body: string;
  tool: string;
  link: string;
  imagePath: string | null;
  postType: "ship" | "ask" | "feedback" | "discussion";
  topicTags: string[];
};

export function emptyDraft(): ComposerDraft {
  return { body: "", tool: "__none__", link: "", imagePath: null, postType: "ship", topicTags: [] };
}

export function draftKey(userId: string, parentShipId: string | null) {
  return `shippedin:composer:v1:${userId}:${parentShipId ?? "post"}`;
}

export function hasDraft(draft: ComposerDraft) {
  return Boolean(draft.body || draft.link || draft.imagePath || draft.topicTags.length || draft.tool !== "__none__" || draft.postType !== "ship");
}

export function parseDraft(raw: string | null): ComposerDraft {
  if (!raw) return emptyDraft();
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return emptyDraft();
    return {
      body: typeof value.body === "string" ? value.body : "",
      tool: typeof value.tool === "string" ? value.tool : "__none__",
      link: typeof value.link === "string" ? value.link : "",
      imagePath: typeof value.imagePath === "string" ? value.imagePath : null,
      postType: ["ship", "ask", "feedback", "discussion"].includes(value.postType) ? value.postType : "ship",
      topicTags: Array.isArray(value.topicTags) ? value.topicTags.filter((tag: unknown) => typeof tag === "string") : [],
    };
  } catch {
    return emptyDraft();
  }
}

export function persistDraft(storage: Pick<Storage, "setItem" | "removeItem">, key: string, draft: ComposerDraft) {
  if (hasDraft(draft)) storage.setItem(key, JSON.stringify(draft));
  else storage.removeItem(key);
}