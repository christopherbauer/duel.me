# duel.me

A real-time strategy game where commanders battle each other in tactical duels. Build your commander, develop strategies, and compete against AI opponents and other players.

## Project Overview

duel.me is a full-stack web application featuring:

- **Goldfish your commander deck** with human-like riffle-shuffling on the backend
- **Load multiple decks** to play against another deck
- **Real-time multiplayer gameplay** with hot seat turns
- **Deck management** with commander identification
- **Support for semantic magic mechanics** such as Scry, Surveil, Exile, etc
- **AI-powered opponents** for single-player challenges
- **LAN and online multiplayer** support
- **Persistent storage** with PostgreSQL database

## Tech Stack

### Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: (See backend package.json for specifics)
- **Containerization**: Docker

### Frontend

- **Framework**: React 18+
- **Language**: TypeScript
- **State Management**: Zustand (see store.ts)
- **Styling**: (See components directory)
- **Containerization**: Docker

### Infrastructure

- **Orchestration**: Docker Compose
- **Database**: PostgreSQL with persistent volumes

## Project Structure

```
duel.me/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── core/           # Core game logic
│   │   ├── db/             # Database configuration
│   │   ├── migrations/     # Database migrations
│   │   ├── routes/         # API endpoints
│   │   ├── seed/           # Database seeders
│   │   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Server entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React web application
│   ├── src/
│   │   ├── api.ts          # API client
│   │   ├── store.ts        # Redux store
│   │   ├── types.ts        # Type definitions
│   │   ├── App.tsx         # Root component
│   │   ├── index.tsx       # Entry point
│   │   └── components/     # React components
│   ├── public/
│   │   └── index.html
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── build/              # Production build output
├── docker-compose.yml      # Multi-container orchestration
├── Makefile                # Development automation
├── PRDs/                   # Product requirements documents
├── scripts/                # Utility scripts
├── log/                    # Application logs
└── postgres_data/          # PostgreSQL data volume

```

## Prerequisites

- **Docker** and **Docker Compose** (for containerized setup)
- **Node.js** 16+ and **npm/yarn** (for local development)
- **PostgreSQL** 13+ (if running without Docker)
- **Make** (optional, for using Makefile commands)

## Getting Started

### Option 1: Docker Compose (Recommended)

```bash
make install
make build
make dev
make seed
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Development

### Available Make Commands

View the [Makefile](Makefile) for all available commands:

```bash
make help       # Show all available commands
make dev        # Start development environment
make build      # Build production images
make test       # Run test suite
```

## Game Mechanics

See the PRDs in `PRDs/` directory for detailed game mechanics:

- **PRD_v0_Battlefield.md** - Core battlefield mechanics
- **PRD_v1_commander_dumb_ai_FULL.md** - AI opponent system
- **PRD_v2_commander_lan_play_FULL.md** - Multiplayer system

## Logging

Application logs are stored in `log/backend/` with rotating log files. Check here for debugging issues.

## Troubleshooting

### Port already in use

```bash
# Change ports in docker-compose.yml or use:
docker-compose down  # Stop all containers
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs db
```

### Frontend can't reach backend

- Ensure backend service is running
- Check API endpoint in `frontend/src/api.ts`
- Verify CORS configuration in backend

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Add license information here]

## Support

For issues or questions:

- Check existing GitHub issues
- Review PRD documents for design decisions
- Check application logs in `log/` directory
