# UI consistency, appearance and release — 2026-10-16

User requests fixes for the supplied Learn screenshot, consistent non-character icons, removal of decorative sparkles, admin theme personalization including the brand mark, overall refinement, then push and a release tag. This is authorized implementation and release on the current feature branch; preserve all existing development. Retain character art, subject colours, facts, game input, voice behaviour and family data.

## Research

- Learn uses fixed viewport rows, full-size 260px island figures, zero-minimum fractional grid rows and a shifted lower row. Desktop-height windows can squeeze rows beneath their contents. Phone-only minimum rows do not fix the screenshot's wider layout.
- Microphone/controller/navigation paths are duplicated across Dock, studio parts and Learn parts; a four-point sparkle is used for create actions. Brand Mark comments claim token colours but its fills are hardcoded.
- Existing admin console has verified custom-claim guards, audited Firestore transactions and server-only config. No public appearance resource or admin appearance setting exists. Global semantic CSS tokens can support coordinated palettes without recolouring baked character art.
- Existing work is extensive and uncommitted on feat/full-development, origin github.com/mubinui/just-imagine. The release must include its required source/assets, omit local keys/data and retain prior history.

## Ordered implementation

1. Shared 24px rounded-stroke SVG controls; recognizable microphone/controller/book/paw actions. Remove decorative sparkle badges/particle bursts, retaining semantic reward stars and actual celestial subject art.
2. Content-safe Learn map grid at desktop, short landscape and phone sizes, aligned rows and preserved dock/story navigation. Normalize labels, control icon dimensions and focus treatments.
3. Protocol appearance preset contract (Forest default, Ocean, Terracotta), public safe read and admin-only audited/versioned write. No private operational config in public payload.
4. Admin Appearance form with actual palette/brand preview, explicit apply, pending/failed/save states. Apply published palette across root semantic UI tokens, themed brand mark and browser icon/theme colour. Keep character/subject artwork original.
5. Meaningful auth/version/audit/default/contrast tests; full relevant source checks and production build. Bounded desktop/phone/short-window screenshots and real admin save→independent visitor reload, then required fresh Impeccable review/documentation.
6. Update TODO/checkpoint; inspect staged files for secrets, run appropriate release checks, commit current completed work, push feature branch and annotated date-based tag. Do not force-push, merge or deploy cloud services.

Risks: default appearance must remain usable if config is absent/offline; nonadmins must not write themes; concurrent operators must not overwrite silently; dark-stage and light-parent contrast must both hold. Theme applies interface/brand colours, not generated scene pixels. Preserve all persistent local families/worlds and do not reset model quota.
