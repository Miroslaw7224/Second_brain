# Workflow testów – komendy i uruchomienie

## Testy jednostkowe

| Cel | Skrypt | Ręcznie |
|-----|--------|---------|
| Uruchom (watch) | `npm test` | — |
| Jednorazowy przebieg | `npm run test:run` | `npx vitest run` |
| Z pokryciem | `npm run test:coverage` | `npx vitest run --coverage` |

Baza: brak — używane są tylko mocki (`lib/firestore-db.js`).

---

## Testy integracyjne (Firestore / Gemini)

### Emulator w Dockerze (zalecane)

Wymagany tylko Docker (Docker Compose V2). W starszym środowisku użyj `docker-compose` zamiast `docker compose`.

| Cel | Komenda |
|-----|---------|
| Uruchom emulator | `docker compose -f docker-compose-test.yml up -d` lub `npm run emulator:docker` |
| Testy (drugi terminal, Unix/Mac) | `FIRESTORE_EMULATOR_HOST=localhost:8080 RUN_INTEGRATION_TESTS=1 npm run test:integration` |
| Testy (drugi terminal, PowerShell) | `$env:FIRESTORE_EMULATOR_HOST="localhost:8080"; $env:RUN_INTEGRATION_TESTS=1; npm run test:integration` |
| Zatrzymaj emulator | `docker compose -f docker-compose-test.yml down` |
| Pełny cykl (emulator → testy → down) | `npm run test:integration:docker` |

Przy błędzie testów kontener nie jest gaszony — ręcznie: `docker compose -f docker-compose-test.yml down`. Na Windows jedna komenda `test:integration:docker` może wymagać WSL2 lub skryptu .ps1.

### Bez emulatora (prawdziwy Firestore z .env)

**Bez emulatora:** uruchom testy przeciw Firestore z konfiguracji `.env` (użyj projektu testowego, nie produkcji):
```bash
npm run test:integration:local
```

| Sposób | Komenda |
|--------|---------|
| Skrypt | `npm run test:integration:local` |
| Ręcznie (Unix/Mac) | `RUN_INTEGRATION_TESTS=1 npm run test:integration` |
| Ręcznie (PowerShell) | `$env:RUN_INTEGRATION_TESTS=1; npm run test:integration` |

Bez zmiennej `RUN_INTEGRATION_TESTS=1` testy wymagające Firestore/Gemini są pomijane (skip).

---

Szczegóły: [tests/integration/README.md](../integration/README.md), [ADR-015](../../docs/adr/015-testing-strategy.md), [ADR-016](../../docs/adr/016-firestore-emulator-docker.md).
