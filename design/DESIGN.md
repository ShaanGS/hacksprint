# Design rules

The app looks like the Uber rider app in light mode: white pages, grey pills and tiles, black text and black buttons, with colour coming from 3D art. These rules are adapted from the team's own mazhai app, which measured 15 Uber screenshots. The references in `references/` are mazhai screens mapped to ours: copy their visual language, not their wording or flows. Spec section 9 decides the screens; this file decides the look.

Build from the primitives in `apps/web/components/ui/` and check them at `/styleguide`. Values live in `tokens.ts`.

## Screens

- One job per screen and one primary button: pinned to the bottom, full width, 56px, black, and its label names the choice ("Approve ₹121 order", "Use jaggery").
- A white page has a big bold title top left (28px). A sheet has a grabber, a centred bold 20px title that names the job, then a hairline.
- Mobile first at 390px. Tap targets at least 44px. On a laptop or projector the app sits in a phone frame (`AppFrame`), so the demo looks like the phone in a judge's hand.

## Look

- **Colours:** black, white and grey everywhere. Green (`success`) only for paid, collected and in stock. Red (`danger`) only for out of stock, rejected and overdue. Never tint a whole card to show status; use one small `Badge` or a struck-through `Amount`.
- **Art carries the colour.** 3D art on every product row, tile and empty state, straight on the surface with no circle or box behind it. Banners for feature cards.
- **Radius:** 8px inputs, 12px buttons and tiles, 16px cards and the selected-row outline, 24px sheet tops, full for chips and tags.
- **Spacing:** a 4px grid, 16px side gutters, 12px between tiles, rows at least 56px.
- **Type:** the system font, which phones already ship with Tamil, Devanagari and Kannada. Text is 12, 14, 16 or 18px at weight 400 or 500. Headings are 20, 24, 28 or 32px at weight 700. Numbers use `tabular-nums`.
- **Lists are flat rows, not cards** (`ListRow`): art on the left, the name (18px) and one grey meta line in the middle, the amount on the right. The chosen row gets a 2px black outline.
- **Icons:** `lucide-react`, 20 to 24px. No emoji, gradients or glows. Shadows only on things that float.
- **Motion:** `Ticker` counts totals to their new value. Nothing loops except the mic while it listens.

## Words

- Every spoken line also shows as text, in the customer's language: Tamil, Hindi, Kannada or English, in its own script.
- Plain everyday words. No em dashes, no exclamation marks, no "seamless" or "optimise".
- Money is `formatMoney(paise)`: `₹1,240`, `₹23.50`. Times are 12 hour ("6:40 PM").
- Real data only: real product names, rupee amounts and Indian customer names. Never print "Demo", "Sample" or "Mock" on a screen.

## Art recipe

All art comes from Magnific's image generator (auto mode), so new pieces match. Use these templates word for word and change only the subject.

**Objects** (1:1, background removed, saved as 512px PNG in `apps/web/public/art/`):

> 3D render of [subject], miniature toy style, smooth rounded shapes, soft glossy plastic material, front three-quarter view from slightly above, soft studio lighting, centered, isolated on a plain pure white background, single object only, no weighing scale, no stand, no text, no logos, no people

Say "toy style", not "toy scale": with groceries the model reads "scale" as a weighing scale.

**Banners** (16:9, saved as 1280px JPEG named `banner-*.jpg`):

> Flat vector illustration in the clean style of a modern ride-hailing app promo banner: [scene]. Simple geometric shapes, limited palette of [four or five colours], soft flat shading, no text, no logos, wide composition
