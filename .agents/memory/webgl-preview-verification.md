---
name: WebGL preview verification
description: Limits of screenshot-based verification for decorative GPU effects.
---

The app-preview capture browser may not provide a WebGL context, even when the application itself loads correctly.

**Why:** Desktop and mobile captures during light-ray integration both lacked WebGL and rendered the static fallback instead.

**How to apply:** Keep decorative GPU effects optional. Verify the no-WebGL presentation and usable page content in screenshots; do not claim that screenshot verification exercised the animated shader.
