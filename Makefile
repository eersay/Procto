# ============================================================
#  PROCTO — Makefile (shortcuts for common commands)
#  Usage: make <target>
# ============================================================

.PHONY: help up down build logs shell-backend shell-db migrate seed reset nuke

# Default target
help:
	@echo ""
	@echo "  PROCTO Dev Commands"
	@echo "  ─────────────────────────────────────────"
	@echo "  make up          Start all containers (build if needed)"
	@echo "  make down        Stop all containers"
	@echo "  make build       Rebuild all images"
	@echo "  make logs        Tail logs from all services"
	@echo "  make logs-be     Tail backend logs only"
	@echo "  make logs-fe     Tail frontend logs only"
	@echo "  make shell-be    Open shell in backend container"
	@echo "  make shell-db    Open psql in postgres container"
	@echo "  make shell-redis Open redis-cli in redis container"
	@echo "  make migrate     Run Prisma migrations"
	@echo "  make generate    Regenerate Prisma client"
	@echo "  make studio      Open Prisma Studio (DB GUI)"
	@echo "  make seed        Run DB seed script"
	@echo "  make reset       Reset DB (DROP + re-migrate + seed)"
	@echo "  make nuke        Stop containers AND delete all volumes"
	@echo ""

# ── Start / Stop ─────────────────────────────────────────────
up:
	docker-compose up --build

down:
	docker-compose down

build:
	docker-compose build --no-cache

# ── Logs ─────────────────────────────────────────────────────
logs:
	docker-compose logs -f

logs-be:
	docker-compose logs -f backend

logs-fe:
	docker-compose logs -f frontend

# ── Shells ───────────────────────────────────────────────────
shell-be:
	docker-compose exec backend sh

shell-db:
	docker-compose exec postgres psql -U $(shell grep POSTGRES_USER .env | cut -d '=' -f2) -d $(shell grep POSTGRES_DB .env | cut -d '=' -f2)

shell-redis:
	docker-compose exec redis redis-cli -a $(shell grep REDIS_PASSWORD .env | cut -d '=' -f2)

# ── Prisma ───────────────────────────────────────────────────
migrate:
	docker-compose exec backend npx prisma migrate dev

generate:
	docker-compose exec backend npx prisma generate

studio:
	docker-compose exec backend npx prisma studio --port 5555 --browser none
	@echo "Prisma Studio running at http://localhost:5555"

seed:
	docker-compose exec backend npx prisma db seed

reset:
	docker-compose exec backend npx prisma migrate reset --force

# ── Nuclear Option ───────────────────────────────────────────
nuke:
	docker-compose down -v
	@echo "All containers stopped and volumes deleted."