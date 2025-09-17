.PHONY: help up down build logs ps restart shell-api shell-web test lint format

# Colors
GREEN=\033[0;32m
YELLOW=\033[0;33m
RESET=\033[0m

help:
	@echo "------------------------------------------------------------------------"
	@echo "${YELLOW}NovaStream Monorepo Makefile${RESET}"
	@echo " A collection of shortcuts for managing the project."
	@echo "------------------------------------------------------------------------"
	@echo "\n${GREEN}Usage:${RESET}"
	@echo "  make [command]\n"
	@echo "${GREEN}Commands:${RESET}"
	@echo "  ${YELLOW}up${RESET}              - Start all services with Docker Compose."
	@echo "  ${YELLOW}down${RESET}            - Stop all services."
	@echo "  ${YELLOW}build${RESET}           - Build or rebuild services."
	@echo "  ${YELLOW}logs${RESET}            - Follow logs for all services."
	@echo "  ${YELLOW}logs-api${RESET}        - Follow logs for the API service."
	@echo "  ${YELLOW}logs-web${RESET}        - Follow logs for the Web service."
	@echo "  ${YELLOW}ps${RESET}              - List running containers."
	@echo "  ${YELLOW}restart${RESET}         - Restart all services."
	@echo "  ${YELLOW}shell-api${RESET}       - Get a shell inside the API container."
	@echo "  ${YELLOW}shell-web${RESET}       - Get a shell inside the Web container."
	@echo "  ${YELLOW}install${RESET}         - Install all pnpm dependencies."
	@echo "  ${YELLOW}test${RESET}            - Run all tests in the monorepo."
	@echo "  ${YELLOW}test-e2e${RESET}        - Run API end-to-end tests."
	@echo "  ${YELLOW}lint${RESET}            - Lint all packages."
	@echo "  ${YELLOW}format${RESET}          - Format all code with Prettier."
	@echo "  ${YELLOW}clean${RESET}           - Remove all node_modules and build artifacts."

up:
	@echo "${GREEN}Starting all services...${RESET}"
	@docker-compose up --build -d

down:
	@echo "${GREEN}Stopping all services...${RESET}"
	@docker-compose down

build:
	@echo "${GREEN}Building services...${RESET}"
	@docker-compose build

logs:
	@docker-compose logs -f

logs-api:
	@docker-compose logs -f api

logs-web:
	@docker-compose logs -f web

ps:
	@docker-compose ps

restart: down up

shell-api:
	@docker-compose exec api /bin/sh

shell-web:
	@docker-compose exec web /bin/sh

install:
	@echo "${GREEN}Installing pnpm dependencies...${RESET}"
	@pnpm install

test:
	@echo "${GREEN}Running all tests...${RESET}"
	@pnpm test

test-e2e:
	@echo "${GREEN}Running API e2e tests...${RESET}"
	@pnpm test:e2e

lint:
	@echo "${GREEN}Linting all packages...${RESET}"
	@pnpm lint

format:
	@echo "${GREEN}Formatting codebase...${RESET}"
	@pnpm format

clean:
	@echo "${YELLOW}Cleaning up project...${RESET}"
	@rm -rf node_modules
	@rm -rf packages/*/node_modules
	@rm -rf packages/*/dist
	@rm -rf packages/web/.next
	@echo "${GREEN}Done.${RESET}"
