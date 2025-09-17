up:
	docker compose up --build -d
down:
	docker compose down -v
logs:
	docker compose logs -f --tail=200
restart:
	docker compose down && docker compose up --build -d
test:
	pnpm -r test
