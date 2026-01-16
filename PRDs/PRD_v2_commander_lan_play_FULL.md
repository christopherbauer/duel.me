# PRD v2 — Local Network Multiplayer (LAN)

## 1. Overview
v2 enables Commander games between multiple players on the same local network without requiring cloud infrastructure.

## 2. Problem Statement
Many players want face-to-face or LAN play without relying on internet services, accounts, or matchmaking.

## 3. Goals
- Enable LAN-hosted Commander games
- Preserve hidden information correctly
- Support reconnects and session stability

## 4. Non-Goals
- Internet matchmaking
- Authentication systems
- Spectator or ranked play

## 5. Target Users
- Friends playing on the same network
- Playgroups testing decks together
- Local events or meetups

## 6. User Stories
- As a host, I can start a game on my machine.
- As a player, I can join via IP or link.
- As a player, I can reconnect if I refresh.

## 7. Functional Requirements

### 7.1 Game Modes
- 1v1 Commander
- Solo vs AI
- Dual-seat self-duel

### 7.2 Lobby
- Player slots
- Deck loaded status
- Ready indicators

### 7.3 Networking
- WebSocket sync
- Host-authoritative state
- Join tokens

## 8. UX Requirements
- Connection status indicators
- Clear host/guest roles
- Rejoin flow

## 9. Technical Requirements
- Exposed local port
- Docker-compose compatibility
- Stateless clients

## 10. Risks
- Network instability
- Sync edge cases

## 11. Acceptance Criteria
- Two machines can play on LAN
- Hidden zones enforced
- AI and solo modes still work
