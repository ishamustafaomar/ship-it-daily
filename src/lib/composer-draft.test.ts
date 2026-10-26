import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
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
    assert.deepEqual(parseDraft(storage.getItem(key)), draft);
    assert.equal(parseDraft(storage.getItem(key)).body.length, 30);
  });
  test("isolates replies by thread and drafts by account", () => {
    const storage = memoryStorage();
    persistDraft(storage, draftKey("a", "thread-1"), { ...emptyDraft(), body: "Congrats!" });
    assert.equal(parseDraft(storage.getItem(draftKey("a", "thread-1"))).body, "Congrats!");
    assert.equal(parseDraft(storage.getItem(draftKey("a", "thread-2"))).body, "");
    assert.equal(parseDraft(storage.getItem(draftKey("b", "thread-1"))).body, "");
    assert.equal(parseDraft(storage.getItem(draftKey("a", null))).body, "");
  });
  test("clears saved data when discarded or posted successfully", () => {
    const storage = memoryStorage();
    const key = draftKey("a", null);
    persistDraft(storage, key, { ...emptyDraft(), body: "Ready to ship" });
    persistDraft(storage, key, emptyDraft());
    assert.equal(storage.getItem(key), null);
  });
  test("handles corrupt saved data without losing the composer", () => {
    assert.deepEqual(parseDraft("{bad json"), emptyDraft());
  });
});