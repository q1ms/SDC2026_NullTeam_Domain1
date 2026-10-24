---
name: Professional profile intake choices
description: Confirmed product direction for quick/detailed intake and LinkedIn-related onboarding.
---

The product should offer Quick and Detailed profile modes over one shared professional profile, rather than replacing the short intake with a mandatory long form.

**Why:** The user wants both a simple option and a full LinkedIn-style option based on their professional-background field list.

**How to apply:** Keep additional professional sections optional and preserve detailed information when users switch to the quick experience.

Quick and Detailed should be separate visible form experiences, not a quick form followed by extra detailed sections.

**Why:** The user explicitly requested hiding the quick profile fields when Detailed is selected, just as detailed-only sections are hidden in Quick.

**How to apply:** Show only the selected form experience while retaining the shared draft; keep any required inputs accessible in the selected mode rather than creating hidden validation blockers.

Detailed profile uses manual fields without the “Import from text” panel; retain the optional LinkedIn profile URL.

**Why:** The user subsequently asked to remove text import from Detailed profile, superseding the earlier paste-to-import choice.

**How to apply:** Do not reintroduce the import panel into Detailed profile. Preserve existing profile data and distinguish saved links from authenticated LinkedIn connections; revisit import or OAuth only if explicitly requested.

Areas of interest are open-ended; the suggestions are not an allowed-values list.

**Why:** The user explicitly wants this field to accept answers outside the predefined list.

**How to apply:** Allow custom interests as removable tags in both modes, and preserve them through saving and pathway generation without requiring a known category.

Résumé upload should extract text from PDF, DOCX and TXT files locally in the browser, then send only that extracted text to the AI service for profile analysis. Do not upload or persist the original document bytes or log raw text on the server.

**Why:** The user wants AI-assisted extraction because résumé formats vary, while keeping the original file local and making the text-to-AI transfer clear in the interface.

**How to apply:** Keep file decoding client-side and disclose that extracted text is sent for analysis. Treat returned values as editable suggestions, avoid duplicate skills, save only when the user submits, and restrict any requested raw-text browser logging to development mode.
