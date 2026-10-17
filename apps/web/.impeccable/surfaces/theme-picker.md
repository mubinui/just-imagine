---
version: 1
slug: 'theme-picker'
primary_target: 'components/ThemePicker.tsx'
related_targets: ['lib/appearance.ts', 'components/AppearanceProvider.tsx', 'app/theme-picker.css']
---

# Surface brief: Personal app theme

Mode: Operate. An end user chooses the interface colors on this device with a native select: Follow app default, Forest, Ocean or Terracotta. The existing semantic palettes, typography, character paintings and generated worlds remain intact. Selection applies immediately, without a modal or publication action.

The complete picker appears in parent Settings. A compact labeled select remains reachable from the shared family header, Studio/Learn header, Stories header, operator header and school/student header. English and Bangla copy live with this component. At phone widths the stage keeps the title and select together, with its existing voice status on the following line; the Stories control occupies a separate grid row.

The operator continues to publish the shared default through Admin Appearance. The separate validated `ji-theme-preference` device value takes precedence over the published-default `ji-appearance` cache and polling. Follow app default removes that override. Tokens, mark/favicon, browser color and theme manifest resolve from the same effective preset. Storage failure retains a working in-memory choice and states that it applies for this visit. Cross-tab changes update the selection without writing them back.

Verification belongs to source regressions for precedence, cache/reload, invalid data, polling/event races, cross-tab changes, unavailable storage and cleanup. Root performs native desktop/phone confirmation; this implementation agent performs no browser automation or production data writes.
