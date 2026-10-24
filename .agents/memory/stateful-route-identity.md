---
name: Stateful route identity
description: Preserve form state and submission locks across parent mutation and cache updates.
---

Render stateful Wouter pages as stable child elements rather than newly created inline functions passed to the component prop.

**Why:** Profile-saving updates caused the parent to rerender, replacing the route component type. The form appeared to reload, lost its loading state and synchronous lock, and allowed duplicate AI requests despite preventing the native submit event.

**How to apply:** When a form appears to refresh during an async operation, check component identity and remounts as well as native navigation. Browser verification should preserve both the document marker and exact form DOM node across mutation updates.

Page-level static rendering tests should use the router's supported server-rendering context rather than fake browser globals.

**Why:** Wouter's browser-location hook otherwise reads browser-only location state even during static rendering; mocking globals would hide that assumption instead of testing the page in a valid routing context.

**How to apply:** Give server-rendered page tests an explicit server route, while keeping browser-specific interaction checks separate.
