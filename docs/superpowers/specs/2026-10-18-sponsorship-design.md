# Sponsorship on free accounts — design

Date: 2026-10-18. Status: plan, written from the product owner's request and the expert judgement they asked for; implementation follows the current audit release.

## The request

The product owner wants operators to run advertisements for different products on free accounts, appearing while a game, story or world is generated, with the advertised product added to what is generated.

## Recommendation, and why the request is reshaped

Placing advertised products inside the games and stories a child creates is stealth advertising to children. It blurs the line between a child's own creation and a commercial message, which young children cannot reliably tell apart, and it conflicts with:

- the US Children's Online Privacy Protection Act (COPPA) and the FTC's guidance against blurring advertising and content for children;
- the UK Age Appropriate Design Code (Children's Code);
- the Google Play Families policy and the App Store guidelines for apps for children, both of which restrict ads in child-directed apps to certified, contextual, clearly labelled formats;
- the trust parents give a learning app.

It would also put the app's distribution at risk, since both stores can remove a family app for ad-policy violations.

The plan keeps the intent (revenue from free accounts, reaching families at the moment of generation) in a form that is defensible and approvable:

1. **Sponsor cards while something is being made, never inside it.** While a world, game or story is generated on a free account, the waiting screen may show one clearly labelled card: "Brought to you by …", in the style of public-broadcasting underwriting. The child's creation never contains sponsor names, logos or products.
2. **Parent-facing offers.** Product offers (books, toys, courses) are shown to parents in the parent area and in parent emails, where adults decide.
3. **No tracking of children.** No behavioural targeting, no third-party ad SDKs, no identifiers sent to advertisers. Targeting is contextual only: age band, language and the creation's subject (space, animals …).
4. **A parent gate before anything leaves the app.** Child screens show sponsor cards without links; a "Learn more" for parents sits behind the existing parent gate.
5. **A family plan removes sponsorship entirely.**

## Goals

- Operators can create, review, schedule and stop sponsorship campaigns from the admin console.
- Free accounts see at most one sponsor card per generation, with frequency caps per day.
- Every card is labelled, age-appropriate and pre-approved; nothing appears without approval.
- Reporting is aggregate only: impressions and parent-side clicks per campaign, never per child.

## Non-goals

- Programmatic or third-party ad networks.
- Ads inside child creations, voice lines spoken by characters, or sponsor products as story elements.
- Video ads, sound, or anything that interrupts play.

## Anti-goals

- A child unable to tell a sponsor message from their own creation.
- Any child data reaching an advertiser.
- A sponsor card that delays or blocks a creation.

## Data model (new, needs the other developer's review: protocol change)

- `campaigns/{id}`: sponsor name, bilingual card copy (title, line), approved artwork asset, category (from an allowlist: books, educational toys, museums, learning courses, healthy food, outdoor activities), audience (age bands, languages, subjects), placement (`generation-wait` for children, `parent-dashboard` and `parent-email` for parents), schedule (start, end), daily impression cap per account, status (`draft`, `in-review`, `approved`, `live`, `paused`, `ended`), reviewer and audit trail.
- `sponsorshipStats/{campaignId}/{day}`: aggregate counts only.

## Flows

**Operator (admin console, new "Sponsors" page).** Create a campaign; upload artwork; preview the card exactly as a child or parent will see it in both languages; submit for review; a second operator approves; schedule; pause or end at any time. Every action appears in the audit log. The system kill switch also stops sponsorship.

**Child (free account).** When generation starts, the building screen may show the sponsor card beside the friend's painting: small, clearly labelled ("Sponsor"), no link, no sound, and it never delays the reveal. The building badge on other screens never shows sponsors.

**Parent (free account).** The parent dashboard may show one parent-placement offer with a "Learn more" link; parent emails may include one labelled offer. Parents can see in Settings why they see sponsors and how the family plan removes them.

## Safety and review

- Category allowlist and a written content standard (no food high in fat, salt or sugar; no violence; no pressure language; no "ask your parents to buy").
- Artwork passes the existing image check with an advertising-specific question, then human approval.
- Two-person rule: the creator cannot approve their own campaign.

## Phases

1. Protocol and API: campaign documents, review workflow, aggregate stats, server-side selection (contextual, capped).
2. Admin "Sponsors" page with preview, review and reporting.
3. Child generation-wait card and parent dashboard placement.
4. Parent email placement and a Settings explanation.

## Left to the builder

- Exact caps (suggested: one child card per generation, at most three per day; one parent offer per dashboard visit).
- The legal review of the content standard before launch in each market.
