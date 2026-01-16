
help:
	@echo "duel.me — Commander Duel Playtester"
	@echo ""
	@echo "Commands:"
	@echo "  make install      — Install dependencies for backend and frontend"
	@echo "  make build        — Build backend and frontend"
	@echo "  make up           — Start all services (Docker Compose)"
	@echo "  make down         — Stop all services"
	@echo "  make logs         — View logs from all services"
	@echo "  make dev          — Start services in development mode with hot reload"
	@echo "  make seed         — Seed Scryfall card data"
	@echo "  make clean        — Clean build artifacts and node_modules"
	@echo "  make stop         — Stop all services without removing volumes"

install:
	cd backend && npm install
	cd frontend && npm install

build:
	cd backend && npm run build
	cd frontend && npm run build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

dev:
	docker compose up

seed:
    docker exec -it duelme_backend sh -c "npm run seed"

stop:
	docker compose stop

clean:
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/dist frontend/build frontend/node_modules
	docker compose down -v
