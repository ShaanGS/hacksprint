---
name: design-system
description: Use for any UI work in this project (screens, components, styling, layout). Defines how to derive tokens from reference images and the rules every screen must follow.
---

# Design system

Reference images in `design/references/` are the source of truth for look and feel. Files are named by screen (`01-voice-order.png`, `02-order-card.png`, ...).

## Before the first screen

1. Look at every reference image.
2. Write `design/tokens.ts`: semantic colours (`surface`, `surfaceMuted`, `ink`, `inkMuted`, `accent`, `success`, `danger`, `border`), type scale, spacing scale, radius, shadow. Wire them into the Tailwind theme.
3. Build primitives in `components/ui/`: Button, Card, ListRow, Badge, Sheet, Amount, MicButton.
4. Build `/styleguide` showing every primitive in every state. Stop and get approval before any screen.

## Rules for every screen

- Only tokens and primitives. No raw hex, no arbitrary values like `mt-[13px]`, no one-off font sizes.
- Match the reference for spacing, density, radius and type weight. When unsure, open the reference again and compare.
- Mobile first at 390px. Tap targets at least 44px. One primary action per screen.
- Light theme, high contrast, readable on a projector.
- Every spoken message also shows as text in the user's language.
- Real Indian data: rupee amounts formatted `₹1,240`, real product names, Tamil and Hindi customer names.
- Copy the visual language of references only. Never their logos, brand names or text.
- After building a screen, screenshot it at 390px and compare with its reference before calling it done.
