# Design rules

Two moods, one app. The owner's everyday screens are light and calm: a soft mint canvas, white rounded cards, deep teal pill buttons and toy-style art in mint circles, after `references/10-teal-grocery.jpg`. When he speaks, or hands a job to an agent, the app switches to a dark indigo layer with a neon lime mic and a listening orb, after `references/11-indigo-voice.jpg`. Copy the references' visual language, never their wording or flows. Spec section 9 decides the screens; this file decides the look.

Build from the primitives in `apps/web/components/ui/` and check them at `/styleguide`. Values live in `tokens.ts`.

## Screens

- A light screen sits on the mint `canvas`. Content lives in white cards (`Card`, radius 24, `shadow-card`); the canvas shows between them.
- Every screen has one hero: a deep teal card with the screen's big number, or a pastel `PromoCard` with a cutout. Never a page of same-weight rows.
- One job per screen and one primary button: a full-width pill, teal on light screens, lime for anything an agent does. Its label names the choice ("Send to Murugan Traders").
- The header: a round language button, the shop's name with a small label above it, the demo badge while on demo data, a teal pill with the owner's initial; the page headline under it (28px, bold).
- Mobile first at 390px. Tap targets at least 44px. Bottom bars respect the safe area. On a laptop or projector the app sits in a phone frame (`AppFrame`).
- Messages (saved, paid, offline) rise as toasts just above the tab bar. Nothing ever covers a title.

## The night layer

- Voice and the agents use `night` (page), `nightRaised` (cards), `indigo` (pills, the step rail, chosen chips) and `nightMuted` (secondary text). Text is white.
- `lime` with `limeInk` is the one action colour there, and the mic everywhere.
- Listening shows the orb (`Orb`), "I'm listening…", an example line in the owner's language, and the big lime mic. Answers show what he said in big white type, then the answer in a raised card.

## Look

- **Colours:** teal (`accent`) for actions and the active tab; `accentSoft` for selected chips and art circles. Green (`success`) only for paid and collected, amber (`warning`) only for running low, red (`danger`) only for overdue and failures. Status is a `Badge`, never a tinted card.
- **Art:** the toy-style cutouts. In rows and shortcuts they sit in a mint circle (`surfaceMuted`); on hero and promo cards they sit free on the right, 96 to 140px.
- **Radius:** 24px cards and sheet tops, 16px inner tiles, full for buttons, inputs, chips, badges and avatars.
- **Spacing:** a 4px grid, 16px side gutters, 12px between cards in a grid, 16px inside cards.
- **Type:** Plus Jakarta Sans for English and every number, Noto Sans for Tamil, Devanagari and Kannada. Body 14 to 17px. Headlines 22 to 32px bold. Hero numbers 44px extra-bold with `tabular-nums`. Tamil labels may take 2 lines; nothing is cut mid-word.
- **Lists:** `ListRow`: the art circle, a title (2 lines at most), one grey meta line that wraps, the amount top right.
- **Depth:** cards on the canvas get `shadow-card`; the tab bar and sheets float (`shadow-float`, `shadow-sheet`).
- **Icons:** `lucide-react`, 20 to 24px, in round buttons where they stand alone. No emoji.
- **Press:** buttons, tiles and cards shrink a little when pressed.

## Motion

- Motion explains a change: new items rise into place, totals count to their new value, steps tick in order.
- Animate position and scale, not fades from nothing: a paused tab or a screenshot must never show a blank screen.
- Loops only while the app is listening, thinking or loading (the orb). Reduced motion turns them off.

## Words

- Every spoken line also shows as text, in the customer's language: Tamil, Hindi, Kannada or English, in its own script.
- Plain everyday words. No em dashes, no exclamation marks, no "seamless" or "optimise".
- Money is `formatMoney(paise)`: `₹1,240`, `₹23.50`. Times are 12 hour ("6:40 PM").
- Real data only: real product names, rupee amounts and Indian customer names. Never print "Sample" or "Mock" on a screen. While the shop runs on seeded demo data, one quiet "Demo data" label shows it (spec rule 12).

## Art recipe

All art comes from Magnific's image generator (auto mode), so new pieces match. Use this template word for word and change only the subject.

**Objects** (1:1, background removed, then trimmed and padded to the same 8% margin, saved as 512px PNG in `apps/web/public/art/`):

> 3D render of [subject], miniature toy style, smooth rounded shapes, soft glossy plastic material, front three-quarter view from slightly above, soft studio lighting, centered, isolated on a plain pure white background, single object only, no weighing scale, no stand, no text, no logos, no people

Say "toy style", not "toy scale": with groceries the model reads "scale" as a weighing scale. Describe texture in the subject when it matters ("fine grainy powder").
