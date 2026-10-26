import { describe, expect, test } from "bun:test";
import { draftKey, emptyDraft, parseDraft, persistDraft } from "./composer-draft";

function memoryStorage() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
}

describe("composer drafts", () => {
  test("preserves exact text, type, link, tags, tool and uploaded image on reload", () => {
    const storage = memoryStorage();
    const key = draftKey("builder", null);
    const draft = { ...emptyDraft(), body: "An update\nwith  exact spacing!", postType: "feedback" as const, link: "https://shippedin.dev", topicTags: ["api-costs"], tool: "Lovable", imagePath: "builder/image.png" };
    persistDraft(storage, key, draft);
    expect(parseDraft(storage.getItem(key))).toEqual(draft);
    expect(parseDraft(storage.getItem(key)).body.length).toBe(30);
  });
  test("isolates replies by thread and drafts by account", () => {
    const storage = memoryStorage();
    persistDraft(storage, draftKey("a", "thread-1"), { ...emptyDraft(), body: "Congrats!" });
    expect(parseDraft(storage.getItem(draftKey("a", "thread-1"))).body).toBe("Congrats!");
    expect(parseDraft(storage.getItem(draftKey("a", "thread-2"))).body).toBe("");
    expect(parseDraft(storage.getItem(draftKey("b", "thread-1"))).body).toBe("");
    expect(parseDraft(storage.getItem(draftKey("a", null))).body).toBe("");
  });
  test("clears saved data when discarded or posted successfully", () => {
    const storage = memoryStorage();
    const key = draftKey("a", null);
    persistDraft(storage, key, { ...emptyDraft(), body: "Ready to ship" });
    persistDraft(storage, key, emptyDraft());
    expect(storage.getItem(key)).toBeNull();
  });
  test("handles corrupt saved data without losing the composer", () => {
    expect(parseDraft("{bad json")).toEqual(emptyDraft());
  });
});