# PRD — Battlefield

## 1. Overview

The Battlefield is the primary gameboard UI for the Commander duel application. It is a rules-light, interaction-heavy surface designed to support manual play, deck testing, and future multiplayer expansion.

The Battlefield must:

- Occupy 100% of the viewport height
- Never scroll unless explicitly enabled
- Scale cleanly via browser zoom and internal card scaling
- Support hidden information, seat switching, undo/redo, and tactile card interaction

This PRD defines visual layout, interactions, state management expectations, and UX behavior. It does not enforce Magic: The Gathering rules.

---

## 2. Supported Player Model

### 2.1 Seats

- Two seats are supported in v0 (Seat 1 and Seat 2)
- Architecture must allow future expansion to four players

### 2.2 Orientation

- Seat 2 cards are visually inverted (180° rotation) by default
- A Battlefield Settings toggle allows inversion to be enabled or disabled
- Default state: enabled

---

## 3. Layout & Screen Regions

### 3.1 Vertical Layout

The Battlefield consumes 100% of the viewport height and is divided into fixed regions with no scrolling.

| Region             | Height          |
| ------------------ | --------------- |
| Seat 2 Area        | 5%              |
| Battlefield        | 70%             |
| Active Player Area | 20%             |
| Footer             | Remaining (~5%) |

### 3.2 Scrolling

- No scrolling is allowed anywhere by default
- All content must fit within the allocated regions

---

## 4. Scaling Behavior

### 4.1 Browser Scaling

Browser zoom scales:

- All cards
- All UI elements
- Text and icons
- Animations

### 4.2 Card Size Scaling

Card size scaling:

- Applies only to cards in hand and on the battlefield
- Is independent from browser zoom
- Is configurable via the Battlefield Settings menu
- Supported values: 1×, 2×, 4×

---

## 5. Battlefield Card Layout

### 5.1 Placement Rules

- Cards are free-positioned
- Overlapping is encouraged
- The most recently moved card is always placed at the highest z-index

### 5.2 Soft Alignment

When a card is dropped:

- If the card’s center is within 3px of another card’s center, it aligns to that card
- Otherwise, it remains where dropped

---

## 6. Zones (Active Player Area)

Zones are displayed left-to-right in the following order:

1. Hand
2. Library
3. Graveyard
4. Exile
5. Command Zone

### 6.1 Zone Display

Each zone displays:

- A representative icon or card back
- A count badge indicating the number of cards in that zone

Clicking the count badge displays a breakdown by card type:

- Creature
- Instant
- Sorcery
- Land
- Other

### 6.2 Zone Semantics

- Hand: Cards currently held by the player
- Library: Cards available to draw
- Graveyard: Destroyed or discarded cards
- Exile: Removed cards (still draggable)
- Command Zone: Commander, partners, backgrounds, and other command-available cards

---

## 7. Library Representation & Interactions

### 7.1 Visual Representation

- The library is represented by the back of an MTG card
- Sleeve appearance is configurable

### 7.2 Library Context Menu

Right-clicking or command-clicking the library opens a context menu with the following options:

- Shuffle Library
- Draw X (1, 2, 3, 4, or custom)
- Scry X (1, 2, 3, 4, or custom)
- Surveil X (1, 2, 3, 4, or custom)
- Exile X (1, 2, 3, 4, or custom)

### 7.3 Scry & Surveil Interaction

- Selecting Scry or Surveil opens a popup panel
- The top X cards are revealed
- Cards can be dragged to:
    - Top of library
    - Bottom of library (Scry only)
    - Graveyard (Surveil only)
- All cards must be assigned before confirming

---

## 8. Cards in Play (Battlefield)

### 8.1 Card State

Each card tracks:

- Tapped state
- Face state (face-up, face-down, flipped)
- Counters
- Keywords and abilities (e.g., haste, vigilance)
- Token status

### 8.2 Card Context Menu

Right-clicking or command-clicking a card in play opens a context menu with:

- Tap / Untap
- Face-down
- Flip
- Add Counters (+1/+1, −1/−1, Charge, Generic)
- Counter list with increment/decrement controls
- Create Token Copy (1, 2, 3, 4, or custom)
- Destroy
- Exile

### 8.3 Destroy Behavior

- Destroy moves a card to the graveyard
- Cards with the indestructible state ignore Destroy

### 8.4 Token Copies

- Token copies are not part of the deck
- Tokens inherit appearance and state
- Tokens are removed permanently when destroyed or exiled

---

## 9. Hand Interaction

- Cards are arranged in a horizontal row
- As the cursor moves across the hand:
    - The nearest card enlarges
    - Neighboring cards compress to make space
- No scrolling is used

---

## 10. Footer Controls

### 10.1 Footer Layout

- Left: Back to Home
- Center: Undo / Redo
- Right: End Turn

### 10.2 End Turn Behavior

Ending the turn:

- Switches the active seat
- Untaps all permanents for the new seat
- Clears mana pools
- Clears selections and highlights

End Turn is also bound to the spacebar.

---

## 11. Undo / Redo

- Undo and Redo controls are always visible
- Users may step backward or forward through actions
- Supported actions include:
    - Card movement
    - Tapping/untapping
    - Destroy/exile
    - Token creation
    - Drawing cards

---

## 12. Battlefield Settings Menu

The Battlefield Settings menu is accessed via a three-dot icon in the top-right corner.

Available options:

- Increase browser scale
- Decrease browser scale
- Card size selector (1× / 2× / 4×)
- Toggle opponent card inversion
- Restart game:
    - Restart from original hands
    - Restart entire game (reshuffle)

All restart actions require confirmation.

---

## 13. Animations

- Draw: Card slides from library to hand
- Exile: Card visually burns away
- Destroy: Card fades or falls into the graveyard
- Animations are subtle and non-blocking

---

## 14. Input & Accessibility

- Desktop-first interaction model
- Right-click and command-click supported
- Spacebar ends turn
- Touch support is best-effort

---

## 15. Non-Goals

- Rules enforcement
- Stack legality
- Priority handling
- AI behavior (covered in separate PRDs)
