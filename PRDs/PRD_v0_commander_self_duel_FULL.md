# PRD v0 — Commander Duel Playtester (Self-Duel)

## 1. Overview

v0 delivers a rules-light Commander playtesting application that allows a single user to load two Commander decks and manually duel themselves. The product emphasizes reliability, speed, and UX clarity over rules enforcement or automation.

## 2. Problem Statement

Goldfishing fails to simulate interaction. Existing digital MTG engines are rules-heavy, complex, and slow to iterate with. Players need a lightweight sandbox to test real matchups without learning or fighting a rules engine.

## 3. Goals

- Enable solo Commander matchup testing
- Preserve hidden information correctly
- Avoid external API dependencies during play
- Provide a foundation for AI and multiplayer

## 4. Non-Goals

- Rules enforcement
- AI opponents
- Matchmaking or ranking
- Card pricing or collection tracking

## 5. Target Users

- Commander deck brewers
- Game designers
- Competitive and casual EDH players

## 6. User Stories

- As a player, I can load two decks and play both sides.
- As a player, I can switch seats without breaking hidden info.
- As a player, I can test commander damage and board states.

## 7. Functional Requirements

### 7.1 Game Modes

- Dual-seat solo Commander duel

### 7.2 Zones

- Library, Hand, Battlefield, Graveyard, Exile, Command Zone, Stack

### 7.3 Core Actions

- Draw, shuffle, search, reveal
- Tap/untap, flip
- Counters, attachments, tokens
- Notes and manual reminders

### 7.4 Commander Support

- 40 life start
- Commander designation
- Commander damage tracking
- Manual commander tax

### 7.5 Card Data

- Bulk-preloaded local database
- Offline autocomplete and resolve

## 8. UX Requirements

- Clear seat toggle
- Visible commander indicators
- History log with attribution
- Drag-and-drop interactions

## 9. Technical Requirements

- Online-capable architecture
- Server-authoritative state
- Postgres-backed card store
- Docker-compose local dev

## 10. Risks

- UX confusion around seat switching
- Scope creep toward rules enforcement

## 11. Acceptance Criteria

- Two decks playable by one user
- No external card API calls during play
- Hidden information respected
