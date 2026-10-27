SHELL := /bin/bash
.DEFAULT_GOAL := help

PROJECT_NAME := $(shell node -p "require('./package.json').name" 2>/dev/null)
COMPOSE := docker compose
API := --workspace=apps/api
WEB := --workspace=apps/web
ENV_FILES := .env apps/api/.env apps/web/.env

.PHONY: help install gate smoke dev dev-railway down logs migrate migration seeder reset e2e storybook env db storage

help: ## Lista os comandos
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36mmake %-10s\033[0m %s\n", $$1, $$2}'

# ---------- setup and quality ----------

install: env ## Instala as dependências (api, web e pacotes) e prepara o ambiente
	npm install
	npm exec $(WEB) -- playwright install chromium
	npm run generate

gate: migrate ## Roda tudo que o CI roda: formatação, lint, tipos, testes (100%), build e Storybook
	npm run check

smoke: ## Constrói as imagens de produção sem .env, sobe com variáveis de teste e confere /health e /
	./scripts/smoke.sh

e2e: env ## Sobe a stack em segundo plano, roda os seeders e os testes E2E (Playwright)
	# Generated before the stack: compose would create src/generated owned by root.
	npm run generate $(API)
	$(COMPOSE) up -d --build --wait
	# The specs read seed data (Patas do Bairro, Caramelo); the seeders are idempotent.
	npm run prisma:seed $(API)
	npm run test:e2e $(WEB)

# ---------- local environment ----------

dev: env ## Sobe o projeto localmente (database, migrations, api e web) no Docker
	$(COMPOSE) up --build

# Photos go to the hosted bucket in apps/api/.env.railway; tests never use this.
dev-railway: env ## Como o dev, mas a api grava as fotos no bucket do Railway (apps/api/.env.railway)
	@test -f apps/api/.env.railway || { echo "Crie apps/api/.env.railway a partir de apps/api/.env.railway.example"; exit 1; }
	$(COMPOSE) -f docker-compose.yml -f docker-compose.railway.yml up --build

down: ## Para e remove os containers (make down v=1 também apaga os dados do banco)
	$(COMPOSE) down $(if $(v),-v,)

logs: ## Acompanha os logs da stack (make logs s=api para um serviço)
	$(COMPOSE) logs -f $(s)

storybook: ## Abre o Storybook do web em http://localhost:6006
	npm run storybook $(WEB)

# ---------- database ----------

migrate: db ## Aplica as migrations pendentes
	npm run prisma:deploy $(API)

migration: db ## Cria uma migration a partir do schema (make migration name=add_users)
	@if [ -z "$(name)" ]; then echo "Uso: make migration name=<nome_da_migration>"; exit 1; fi
	npm run prisma:migrate $(API) -- --name $(name)

seeder: migrate storage ## Popula o banco e o MinIO local com os seeders (idempotente)
	npm run prisma:seed $(API)

reset: db storage ## Apaga o banco, reaplica as migrations e roda os seeders (pede confirmação)
	@if [ -z "$(force)" ]; then \
		read -r -p "Isso apaga TODOS os dados do banco local. Continuar? [s/N] " answer; \
		[[ "$$answer" =~ ^[sSyY]$$ ]] || { echo "Cancelado."; exit 0; }; \
	fi; \
	npm exec $(API) -- prisma migrate reset --force && npm run prisma:seed $(API)

# ---------- internal ----------

env: $(ENV_FILES)

# Created only when missing; never overwrites an existing .env.
$(ENV_FILES):
	@sed -e 's/<nome-do-projeto>/$(PROJECT_NAME)/g' $@.example > $@
	@echo "$@ criado a partir de $@.example"

db: env
	$(COMPOSE) up -d --wait database

# The seeds upload their photos to the dev MinIO (never to the hosted bucket).
storage: env
	$(COMPOSE) up -d --wait minio
	$(COMPOSE) up minio-init
