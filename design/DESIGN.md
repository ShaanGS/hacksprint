# Design rules

Clean, warm and alive. The bones are the Uber rider app in light mode: white pages, black type, one black button. The warmth comes from 3D toy art and from feature panels in the colours of our banners. These rules grew out of the team's own mazhai app; the references in `references/` are mazhai screens mapped to ours, so copy their visual language, not their wording or flows. Spec section 9 decides the screens; this file decides the look.

Build from the primitives in `apps/web/components/ui/` and check them at `/styleguide`. Values live in `tokens.ts`.

## Screens

- Every screen has one hero moment: a feature card, a big piece of art (120 to 160px), or a stage illustration. Never a page of grey boxes.
- One job per screen and one primary button: black, full width, 56px, pinned to the bottom, and its label names the choice ("Approve ₹121", "Use jaggery").
- A page title is 28 to 32px, extra-bold, tight tracking, top left. A sheet has a grabber, a centred 20px title that names the job, a hairline, and its button pinned in a footer.
- Mobile first at 390px. Tap targets at least 44px. Bottom bars respect the phone's safe area. On a laptop or projector the app sits in a phone frame (`AppFrame`).

## Look

- **Colours:** black, white and grey for the interface. Green (`success`) only for paid, collected and in stock. Amber (`warning`) only for running low. Red (`danger`) only for out of stock, rejected and overdue. Never tint a card to show status; use one `Badge` or a struck-through `Amount`.
- **Feature cards** (`FeatureCard`): a banner flush on top of a solid panel in that banner's darkest colour (`panel-*`), with white text. One per hero moment.
- **Scene tints** (`tint-*`): a soft colour behind hero art only, at most one per screen.
- **Art carries the colour.** 3D art on every product row, tile, card and empty state, straight on the surface with no circle or box behind it. Sizes: 40px inline, 56 to 64px in rows, 72 to 96px in tiles (anchored in a corner, allowed to bleed off the edge), 120 to 160px for heroes.
- **Radius:** 8px inputs, 12px buttons, 16px cards, tiles and the selected outline, 24px sheet tops and hero panels, full for chips, tags and avatars.
- **Spacing:** a 4px grid, 16px side gutters, 12px between tiles, rows at least 56px.
- **Type:** Geist for English and numbers, Noto Sans for Tamil, Devanagari and Kannada. Body 12 to 18px at 400 or 500, labels may be 600. Headings 20 to 40px at 700 or 800 with tight tracking. Numbers use `tabular-nums`.
- **Lists:** flat rows (`ListRow`): art, a name and one grey meta line, the amount on the right. The chosen row gets a 2px black outline. Grids of things use `Tile`.
- **Depth:** only things that float get a shadow: the cart dock, the tab bar and sheets (`shadow-float`, `shadow-sheet`). The tab bar blurs what scrolls under it.
- **Icons:** `lucide-react`, 20 to 24px. No emoji, gradients or glows.
- **Press:** buttons, tiles and cards shrink a little when pressed.

## Motion

- Motion explains a change: new items rise into place, totals count to their new value, steps tick in order, a decided card collapses into its new list. Presets live in `apps/web/lib/motion.ts`.
- Animate position and scale, not fades from nothing: a paused tab or a screenshot must never show a blank screen.
- Loops only while the app is listening, thinking or loading. Reduced motion turns it all off.

## Words

- Every spoken line also shows as text, in the customer's language: Tamil, Hindi, Kannada or English, in its own script.
- Plain everyday words. No em dashes, no exclamation marks, no "seamless" or "optimise".
- Money is `formatMoney(paise)`: `₹1,240`, `₹23.50`. Times are 12 hour ("6:40 PM").
- Real data only: real product names, rupee amounts and Indian customer names. Never print "Demo", "Sample" or "Mock" on a screen.

## Art recipe

All art comes from Magnific's image generator (auto mode), so new pieces match. Use these templates word for word and change only the subject.

**Objects** (1:1, background removed, then trimmed and padded to the same 8% margin, saved as 512px PNG in `apps/web/public/art/`):

> 3D render of [subject], miniature toy style, smooth rounded shapes, soft glossy plastic material, front three-quarter view from slightly above, soft studio lighting, centered, isolated on a plain pure white background, single object only, no weighing scale, no stand, no text, no logos, no people

Say "toy style", not "toy scale": with groceries the model reads "scale" as a weighing scale. Describe texture in the subject when it matters ("fine grainy powder").

**Banners** (16:9, saved as 1280px JPEG named `banner-*.jpg`), each with a matching `panel-*` colour sampled from its darkest strong tone:

> Flat vector illustration in the clean style of a modern ride-hailing app promo banner: [scene]. Simple geometric shapes, limited palette of [four or five colours], soft flat shading, no text, no logos, wide composition
