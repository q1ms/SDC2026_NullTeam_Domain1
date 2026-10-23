---
name: Cross-tab profile conflicts
description: Conflict policy for browser-local career profiles, including clears and CSV replacements.
---

When another tab changes or clears the device profile, preserve this tab's complete working state (including unfinished skill text) and pause saving. Do not automatically merge or replace it. Loading the saved copy or replacing it with this tab requires an explicit, confirmed choice.

**Why:** Automatic adoption could discard active edits; automatic saving could recreate a profile the user deliberately cleared. CSV row identities are not stable across imports, so mixing selections from one dataset with another is unsafe.

**How to apply:** Treat the dataset, provenance, and selection as one snapshot. Retain a data-free change marker after clearing, and coordinate comparisons and writes across tabs. If safe coordination is unavailable, report that edits are only in this tab rather than silently using unsafe saving.
