import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, act } from "react";
import { createServer } from "vite";
import { Window } from "happy-dom";
import { entryControlId, parseProfileText, SECTION_BY_KEY } from "../src/data/professional-profile.ts";

const TEXT = `Unclassified source text
Experience
Title: Same title
Organization: First org
Dates: unknown

Title: Same title
Organization: Second org
End date: mystery
Current: yes

Organization: Third org

Test scores
Test: Exam
Score: 10
Dates: unclear
`;

test("parser review targets are stable record identities and point at available fields", () => {
  const result = parseProfileText(TEXT);
  const [first, second, untitled] = result.sections.experience;
  const before = structuredClone(result);
  const ids = [];
  for (const [section, entries] of Object.entries(result.sections)) {
    for (const entry of entries) {
      for (const warning of result.entryWarnings[entry.id] ?? []) {
        assert.ok(SECTION_BY_KEY[section].fields.some((field) => field.key === warning.field));
        assert.ok(warning.id.startsWith(entryControlId("import", section, entry.id, warning.field)));
        ids.push(warning.id);
      }
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.notEqual(first.id, second.id);
  assert.equal(result.entryWarnings[second.id][0].field, "endDate");
  assert.ok(result.entryWarnings[untitled.id].some((w) => w.field === "title"));
  assert.equal(result.entryWarnings[result.sections.testScores[0].id][0].field, "endDate");
  assert.ok(result.warnings.some((w) => /could not be classified/.test(w)));
  assert.deepEqual(result, before);
});

test("warning activation opens only the preview record, preserves edits, and never applies or submits", async () => {
  const window = new Window({ url: "http://localhost/" });
  const previous = new Map();
  for (const [key, value] of Object.entries({
    window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const { createRoot } = await import("react-dom/client");
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-reskill-import-navigation-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom"] },
  });
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = createRoot(container);
  let applies = 0;
  let submits = 0;
  const profile = {
    currentRole: "Student", industry: "Education", yearsExperience: 0,
    skills: ["Python"], interests: ["EdTech"], weeklyHours: 4,
    professionalBackground: { experience: [{ id: "main", title: "Main draft" }] },
  };
  const before = structuredClone(profile);
  try {
    const { ImportPanel } = await server.ssrLoadModule("/src/components/profile/ImportPanel.tsx");
    await act(async () => root.render(createElement("form", {
      onSubmit: (event) => { event.preventDefault(); submits += 1; },
    }, createElement(ImportPanel, { profile, skills: profile.skills, locked: false, onApply: () => { applies += 1; } }))));
    const doc = window.document;
    const byTestId = (id) => container.querySelector(`[data-testid="${id}"]`);
    const click = async (node) => { assert.ok(node); await act(async () => node.click()); };
    const change = async (node, value) => act(async () => {
      const proto = node.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(node, value);
      node.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    const notes = () => [...byTestId("status-import-record-warnings").querySelectorAll("button")];
    const note = (pattern) => notes().find((button) => pattern.test(button.textContent));
    const activate = async (button, key) => {
      // happy-dom does not synthesize native button activation from key events.
      // Assert the native, tabbable button contract and unhandled Enter/Space, then click.
      assert.equal(button.type, "button");
      assert.equal(button.tabIndex, 0);
      button.focus();
      assert.equal(button.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })), true);
      await click(button);
    };
    await click(byTestId("button-open-import"));
    await change(byTestId("input-import-text"), TEXT);
    await click(byTestId("button-parse-import"));
    assert.equal(byTestId("status-import-warnings").querySelector("button"), null, "global notes are not field links");
    assert.match(byTestId("text-import-unclassified").textContent, /Unclassified source text/);
    await click(doc.getElementById("import-experience-head"));
    await activate(note(/Experience #2.*Could not read date/), "Enter");
    const secondId = doc.activeElement.id;
    assert.match(secondId, /^import-experience-entry-.*-endDate$/);
    assert.equal(doc.activeElement.getAttribute("aria-invalid"), null, "parser notes must not create validation errors");
    assert.equal(doc.getElementById("import-experience-head").getAttribute("aria-expanded"), "true");
    assert.equal(byTestId("button-import-experience-1-edit").getAttribute("aria-expanded"), "true");
    assert.equal(byTestId("button-import-experience-0-edit").getAttribute("aria-expanded"), "false");
    for (const id of doc.activeElement.getAttribute("aria-describedby").split(" ")) assert.ok(doc.getElementById(id));
    await change(doc.activeElement, "2024");
    await activate(note(/Experience #1.*Could not read dates/), " ");
    const firstId = doc.activeElement.id;
    assert.notEqual(firstId, secondId);
    assert.match(firstId, /-startDate$/);
    await activate(note(/Experience #3.*No title/), "Enter");
    assert.match(doc.activeElement.id, /-title$/);
    assert.equal(doc.activeElement.value, "");
    await activate(note(/Experience #2.*Could not read date/), "Enter");
    assert.equal(doc.activeElement.id, secondId);
    assert.equal(doc.activeElement.value, "2024", "switching targets preserves preview edits");
    await click(byTestId("button-import-experience-0-remove"));
    await click(byTestId("button-import-experience-0-confirm-remove"));
    assert.equal(notes().some((button) => /First org/.test(button.textContent)), false);
    assert.equal(note(/Experience #2.*Could not read date/), undefined, "deleted record warnings disappear, remaining ordinals update");
    await click(doc.getElementById("import-experience-head"));
    await activate(note(/Experience #1.*Could not read date/), "Enter");
    assert.equal(doc.activeElement.id, secondId, "deleting a preceding duplicate does not change the target");
    await click(byTestId("button-import-experience-0-edit"));
    const inline = byTestId("status-import-experience-0-warnings").querySelector("button");
    await activate(inline, " ");
    assert.equal(doc.activeElement.id, secondId, "inline warning also expands the editor");
    await click(byTestId("button-review-import"));
    await click(byTestId("button-back-review"));
    await activate(note(/Experience #1.*Could not read date/), "Enter");
    assert.equal(doc.activeElement.value, "2024");
    assert.equal(applies, 0);
    assert.equal(submits, 0);
    assert.deepEqual(profile, before);
    await click(byTestId("button-cancel-import"));
    assert.ok(byTestId("panel-import-idle"));
    assert.equal(byTestId("status-import-record-warnings"), null);
  } finally {
    await act(async () => root.unmount());
    await server.close();
    await window.happyDOM.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
