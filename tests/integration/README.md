# Testy integracyjne

Testy w tym katalogu korzystają z **prawdziwego** Firestore i/lub Gemini API. Nie są uruchamiane w ramach `npm test` / `npm run test:run`.

## Uruchomienie

- **Z flagą (wykonują się testy integracyjne):**  
  `RUN_INTEGRATION_TESTS=1 npm run test:integration`  
  (W systemie Windows w PowerShell: `$env:RUN_INTEGRATION_TESTS=1; npm run test:integration`)

- **Bez flagi:**  
  `npm run test:integration` — testy wymagające Firestore/Gemini są pomijane (skip).

## Wymagania

- Skonfigurowane zmienne środowiskowe (np. `GEMINI_API_KEY`, Firebase/Firestore).
- W CI — osobny job, uruchamiany np. na main lub ręcznie, z ustawioną flagą i sekretami.

Źródło: [ADR-015 Testing Strategy](../../docs/adr/015-testing-strategy.md).
