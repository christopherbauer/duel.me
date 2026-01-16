# PRD v1 — Commander Duel with Dumb AI

## 1. Overview
v1 extends v0 by adding an optional, extremely simple AI opponent to enable hands-off matchup testing without introducing a rules engine.

## 2. Problem Statement
Solo self-duel requires cognitive load for both sides. Players want a passive opponent to pressure the deck without complexity.

## 3. Goals
- Provide an AI that plays cards and attacks
- Never block or invalidate player actions
- Maintain transparency and override control

## 4. Non-Goals
- Smart or competitive AI
- Rules-accurate gameplay
- Combo or threat evaluation

## 5. Target Users
- Deck brewers
- Casual playtesters
- Designers iterating early concepts

## 6. User Stories
- As a player, I can play against an AI instead of myself.
- As a player, I can pause or override AI actions.
- As a player, I can observe AI behavior clearly.

## 7. Functional Requirements

### 7.1 Game Modes
- Solo vs Dumb AI
- Retain dual-seat mode

### 7.2 AI Behavior
- Draws one card per turn
- Plays one land if available
- Casts lowest-cost spells if possible
- Attacks with creatures

### 7.3 AI Constraints
- No stack interaction
- No responses
- No timing awareness

## 8. UX Requirements
- AI action logs
- Manual intervention prompts
- Pause/step controls

## 9. Technical Requirements
- AI submits standard player intents
- Deterministic or seedable behavior

## 10. Risks
- AI confusing users if actions are opaque
- User expectations of smarter play

## 11. Acceptance Criteria
- AI completes turns without crashing
- Player can always override AI
- All v0 functionality remains intact
