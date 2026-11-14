# Karta Arsenał (siódma karta Monolith) — projekt

Data: 2026-11-14
Status: projekt zatwierdzony w rozmowie (sekcje 1–4), do przeglądu przed planami
Nadrzędny spec: `2026-11-11-asystent-lokalny-nexus-design.md` (§6.3 Arsenał, §4.2 zasady zapisu, §6.6 podział na karty)
Powiązane: `2026-11-12-karta-kodeks-design.md`, `2026-11-14-karta-mapa-design.md`, `2026-11-14-notatki-nexus-odczyt-design.md`

Dokument jest publiczny (repo na GitHubie). Nie zawiera danych z etatu ani identyfikatorów kont.

## 1. Cel

Zamienić kartę Arsenał (`Alt+7`), która dziś pokazuje tylko listę zasobów (`src/features/resources/`), w jedno miejsce na to, co jedna osoba wykorzystuje do pracy z agentami AI nad wieloma projektami: skille i prompty, zasoby, kursy oraz polecenia i podział ról agentów.

Burza mózgów z pomocnikami (`agy`, `cursor`) i weryfikacja w repo dały dwie zasady:

1. Arsenał **nie dubluje** istniejących kart. Bugi należą do Projektów, Baza wiedzy do Notatek, reguły MUST/SHOULD do Kodeksu, rejestr reużycia do Mapy (sekcja 8).
2. Arsenał jest **katalogiem i generatorem poleceń**, nie narzędziem wykonującym. Nic nie jest uruchamiane z UI, a repozytoria projektów pozostają tylko do odczytu (CLAUDE.md, zasada nadrzędna).

## 2. Podjęte decyzje

| #   | Decyzja                | Wybór                                                                                                                                                                         |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Zakładki v1            | Cztery: Skille i prompty, Zasoby, Kursy, Agenci i polecenia. Zakładka Bugi z makiety `07-arsenal.html` wypada z Arsenału (A8)                                                 |
| A2  | Nowy kontekst          | `contexts/bc_arsenal/` (pięć plików wg ADR-021). `bc_resources` zostaje bez zmian struktury                                                                                   |
| A3  | Skille                 | Źródłem prawdy jest Vault: `Vault/Arsenal/Skills/<slug>/skill.md` plus opcjonalny `templates/`. Bez `lib/skills/` i bez skanowania `.claude/` poza Vaultem                    |
| A4  | Skille globalne        | Katalog `~/.claude/skills/synced/` jest synchronizowany z konta, więc skille globalne **kopiuje się** do Vaulta jako dokumenty, nie przenosi. Aplikacja ich stamtąd nie czyta |
| A5  | Wdrażanie do projektów | Wdraża agent albo użytkownik, nie aplikacja (zapisy aplikacji tylko do `Vault/`). Aplikacja generuje polecenie albo prompt i pozwala oznaczyć wdrożenie                       |
| A6  | Certyfikaty kursów     | Link oraz opcjonalna ścieżka do PDF wrzuconego ręcznie do `Vault/Documents/`. Bez uploadu z UI                                                                                |
| A7  | Paczka kontekstu       | Poza zakresem v1. Przy wpisach tylko kopiowanie do schowka                                                                                                                    |
| A8  | Bugi, Knowledge itd.   | Przekazane innym kartom (sekcja 8)                                                                                                                                            |
| A9  | Zasoby                 | Dziewięć usprawnień (sekcja 5), bez powiązania zasobu z projektem (makieta pokazuje slug projektu przy zasobie, ale to nie wchodzi do v1)                                     |
| A10 | Etapy                  | Cztery niezależne plany: Zasoby, Skille i prompty, Kursy, Agenci i polecenia (sekcja 7)                                                                                       |

## 3. Skille i prompty

### 3.1 Dokument skilla

Plik `Vault/Arsenal/Skills/<slug>/skill.md`. Nazwa `skill.md` (nie `SKILL.md`) i `type: skill-doc` w frontmatterze chronią przed przypadkowym załadowaniem jako aktywny skill, także po skopiowaniu całego folderu do `.claude/skills/`. Katalog nie nazywa się `.claude`, więc Claude Code w `NEXUS/` go nie widzi. Monolith czyta z Vaulta tylko `Knowledge/` i `Projects/` (`NEXUS_AREAS` w `bc_nexus_docs`), więc nowy katalog nie trafia do Bazy wiedzy w Notatkach.

Frontmatter:

| Pole          | Znaczenie                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `name`        | nazwa skilla (jak w oryginalnym `SKILL.md`)                                                                                |
| `slug`        | zgodny z nazwą folderu, kebab-case                                                                                         |
| `type`        | zawsze `skill-doc`                                                                                                         |
| `summary`     | jedno zdanie do listy, np. „zasady pisania commitów”, do 90 znaków. Gdy brak, lista bierze pierwsze zdanie z `description` |
| `origin`      | `global` / `nexus` / `monolith` / nazwa projektu: skąd skill pochodzi                                                      |
| `description` | opis do aktywacji skilla (zachowany z oryginalnego `SKILL.md`; źródło zastępczego `summary`)                               |
| `deployed`    | lista wdrożeń: `{ project, mode: full\|adapted, date }`; `project` to `id` z `Vault/Projects/_registry.yaml`               |

Szablony skilla leżą w `Vault/Arsenal/Skills/<slug>/templates/`. Aplikacja je wyświetla jako listę plików i pozwala skopiować treść.

### 3.2 Prompty

Prompty są czytane z `Vault/Knowledge/prompty/*.md` bez przenoszenia (mają już frontmatter: `type: prompt`, `model`, `projects`). Brakujące `summary` zastępuje pierwsza niepusta linia treści ucięta do 90 znaków. Widok: kopiuj treść, filtr po modelu i projekcie.

### 3.3 Widok

Karta wpisu pokazuje nazwę, `summary` i chipy projektów z `deployed`. Filtry: rodzaj (skill / prompt), projekt, „niewdrożone nigdzie”. Panel szczegółów (sidebar jak w makiecie) pokazuje treść i listę szablonów.

### 3.4 Wdrażanie do projektu

W szczegółach skilla użytkownik wybiera projekt docelowy i tryb. Lista projektów pochodzi z `listProjects()` kontekstu `bc_projects` (wołanego przez jego `services`, bez czytania `_registry.yaml` wprost); ścieżka docelowa to pole `localPath` (`local_path` w rejestrze). W odróżnieniu od `bc_nexus_docs` Arsenał **nie ukrywa projektów z `owner: work`**: skille wdraża się także do nich, więc takie projekty są na liście i w chipach `deployed`, oznaczone jak w paczce kontekstu (`OWNER_WORK_WARNING`). `deployed.project` spoza listy to wpis pomijany z licznikiem (sekcja 6). Tryby:

- **W całości:** aplikacja generuje polecenie `scripts/deploy-skill.sh <slug> '<local_path>'`, które kopiuje `skill.md` jako `SKILL.md` (bez kluczy `type`, `slug`, `summary`, `origin`, `deployed`, żeby do repozytorium projektu nie trafiła lista innych projektów) oraz zawartość `templates/` obok niego do `<local_path>/.claude/skills/<slug>/`. Skrypt uruchamia użytkownik; odmawia nadpisania istniejącego `SKILL.md` bez `--force`.
- **Zredagowany:** aplikacja generuje sam prompt do skopiowania (do wklejenia dowolnemu agentowi, także przez `ask-helper --role task`) zawierający treść skilla i szablonów, wskazanie `CLAUDE.md` i stacku projektu oraz polecenie „dostosuj i zapisz w repo”.

Po wykonaniu użytkownik klika „Oznacz jako wdrożone”. To jedyny zapis tej zakładki: dopisanie wpisu do `deployed` we frontmatterze (w Vaulcie), jeden wpis na projekt (ponowne oznaczenie zastępuje wpis). Wykrywanie rozjazdu między Vaultem a kopią w repo oraz edycja treści skilla w aplikacji są poza v1.

### 3.5 Migracja

Przeniesienie istniejących skilli do Vaulta (14 z `Monolith/.claude/skills/`, 8 z `NEXUS/.claude/skills/`, skille globalne wybrane ręcznie) to zadanie dla agenta w etapie 2, nie kod aplikacji. Użytkownik przejdzie przez projekty po kolei i zdecyduje, gdzie który skill ma być wdrożony; wynik trafia do `deployed`. Ten sam zapis posłuży karcie Mapa (odłożone tam „mapowanie skill → projekt”, zob. pamięć projektu `mapa-odlozone-decyzje`).

## 4. Kursy i Agenci

### 4.1 Kursy

Plik `Vault/Arsenal/courses.yaml`, zapis z aplikacji (przez `lib/nexus/yaml-store.ts`).

| Pole               | Uwagi                                            |
| ------------------ | ------------------------------------------------ |
| `id`               | generowany                                       |
| `title`, `url`     | wymagane; `provider` opcjonalny                  |
| `status`           | `plan` / `w-trakcie` / `ukonczony`               |
| `completed`        | data, tylko dla `ukonczony`                      |
| `certificate_url`  | opcjonalny link                                  |
| `certificate_file` | opcjonalna ścieżka względna w `Vault/Documents/` |
| `note`             | krótka notatka                                   |

Walidacja: `certificate_file` bez `..` i bez ścieżek bezwzględnych, tylko w `Vault/Documents/`. Brak pliku to ostrzeżenie w UI, nie błąd. Postęp modułów i action items są poza v1.

### 4.2 Agenci i polecenia

Plik `Vault/Arsenal/agents.yaml`, zapis z aplikacji. Trzy sekcje:

- **Kto do czego:** agent, rola, model/tier, kiedy używać.
- **Presety:** nazwa, szablon polecenia `ask-helper`, opis. Tylko do kopiowania, nigdy do uruchamiania z UI.
- **Skrypty:** nazwa, ścieżka, opis, przykład użycia (m.in. `ask-helper.sh`, `agy-ask.sh`, `clear-helpers.sh`, `import-to-vault`).

Dane początkowe wpisuje się ręcznie na podstawie `CLAUDE.md` i `scripts/` podczas wdrożenia. Aplikacja nie parsuje `CLAUDE.md`.

## 5. Zasoby: dziewięć usprawnień

Dane zasobów zostają w `Vault/Resources/resources.yaml` (`bc_resources`). Stan wyjściowy sprawdzony 2026-11-14: 74 zasoby, 11 ulubionych, 47 z miniaturą, 8 tytułów „Just a moment…”, 5 tytułów będących samym URL-em, 14 wystąpień encji HTML.

| #   | Usprawnienie                                                                                                    | Dotyka                                                               |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Klik w wiersz otwiera URL w nowej karcie; edycja tylko pod ołówkiem                                             | `ResourceListItem.tsx`                                               |
| 2   | Formularz dodawania zwijany (przycisk lub modal) zamiast stałego panelu ok. 350 px                              | `ResourceSection.tsx`, `resources.css`                               |
| 3   | Liczniki przy tagach (`tag (N)`) i sortowanie wg częstości                                                      | `ResourceFilterSidebar.tsx`, `resourceFilters.ts`                    |
| 4   | Wyszukiwarka obejmuje tagi                                                                                      | `resourceFilters.ts`                                                 |
| 5   | Skróty: `/` przenosi fokus do wyszukiwarki, `Esc` czyści zapytanie i filtry                                     | `ResourceSection.tsx`, `useResources.ts`                             |
| 6   | Tryb gęsty listy i kompaktowe ulubione zamiast kafli 76×76 px                                                   | `ResourceListItem.tsx`, `ResourceFavoritesBar.tsx`, CSS              |
| 7   | Widok „do poprawy”: filtr zasobów z tytułem „Just a moment…”, tytułem równym URL i bez miniatury                | `useResources.ts`, `resourceFilters.ts`                              |
| 8   | Przy dodawaniu zasobu odrzucić tytuł „Just a moment…” (strona Cloudflare) i użyć domeny jako tytułu zastępczego | `contexts/bc_resources/services.ts` (`fetchPageMetadata`)            |
| 9   | Normalizacja tagów przy zapisie (scalanie wariantów, np. „Agent AI/kurs/nauka” i „Learning/Kursy”)              | `contexts/bc_resources/services.ts`; mapa scalania ustalana w planie |

Przy zasobie z URL pojawia się też **most do Bazy wiedzy**: link „notatka” otwierający notatkę w Notatkach. Reguła: jeśli zasób ma `note_id` (pole już istnieje w modelu, dziś puste we wszystkich zasobach) i jest ścieżką istniejącej notatki w `Knowledge/` (względną względem Vaulta, jak `path` w `bc_nexus_docs`), wygrywa; `note_id` niebędący taką ścieżką jest ignorowany i działa reguła następna: host URL zasobu jest porównywany z hostami z `source_urls` notatek w `Knowledge/`. Przy braku trafienia link się nie pokazuje; przy wielu trafieniach pokazywane jest pierwsze. UI do wpisywania `note_id` nie powstaje w v1. Dopasowanie po domenie jest heurystyką (np. `github.com` pasuje do wielu notatek).

Jednorazowe sprzątnięcie obecnych złych danych (13 tytułów, encje HTML) wykonuje agent jako osobne zadanie z kontrolą `git diff` w repo NEXUS, nie kod aplikacji.

Odłożone: słownik tagów z `tags.yaml` (osiem rekordów niezgodnych z tagami zasobów; dotyka `bc_tags`, osobna decyzja). Odrzucone jako przerost formy: crawler martwych linków, wirtualizacja listy, import/eksport YAML, kafelki z dużymi miniaturami, drzewo folderów, analityka kliknięć, koszty tokenów na żywo.

## 6. Błędy i testy

**Błędy.**

- Uszkodzony `skill.md` lub wpis kursu jest pomijany z licznikiem „pominięto N”; reszta listy się ładuje.
- Brakujący PDF certyfikatu: ostrzeżenie, nie błąd.
- Wszystkie ścieżki przechodzą walidację `lib/nexus/vault-path.ts` (bez `..`, tylko w obrębie Vaulta).
- Zapisy YAML i frontmattera obsługuje `handleServiceError`.

**Testy (TDD, czerwony test najpierw).**

- Jednostkowe: parser frontmattera skilla (w tym zastępcze `summary`), schemat kursu, walidacja `certificate_file`, dopasowanie hosta do `source_urls`, normalizacja tagów, wyszukiwanie z tagami, odrzucanie tytułu „Just a moment…”.
- Komponent: klik wiersza otwiera URL, ołówek otwiera edycję, skróty `/` i `Esc`, filtr „do poprawy”.
- `tests/unit/architecture.static.test.ts`: etap 1 go nie zmienia. Etap 2 go zmienia: `contexts/bc_arsenal/repositories` czyta Vault przez `lib/nexus/vault-fs`, więc trafia do `VAULT_FS_IMPORTERS` (precedens: `4198926` dla `bc_nexus_docs`; jeśli plan pokaże, że wystarczy `markdown-dir`/`yaml-store`, wpis niepotrzebny). Zmiana testu idzie osobnym commitem przed kodem (CLAUDE.md).

## 7. Etapy

Każdy etap ma osobny plan w `docs/superpowers/plans/` i może wejść niezależnie.

1. **Zasoby (sekcja 5):** najmniejszy, bez nowych danych. Zawiera ustalenie mapy normalizacji tagów i most do Bazy wiedzy.
2. **Skille i prompty:** `contexts/bc_arsenal/` (odczyt i zapis `deployed`), widok, generowanie poleceń i promptów wdrożenia, `scripts/deploy-skill.sh`, migracja skilli do Vaulta (zadanie dla agenta).
3. **Kursy:** `courses.yaml`, widok, walidacja certyfikatów.
4. **Agenci i polecenia:** `agents.yaml`, widok, dane początkowe.

Karta zachowuje `Alt+7`, akcent i motyw `[data-card="arsenal"]` z `src/features/cards/`. Zakładki w rejestrze kart: w etapie 2 lista to `resources`, `skills`, `tags` (wejście z `Alt+7` zostaje na `resources`); docelowy zestaw czterech zakładek powstaje po etapach 3–4.

## 8. Przekazane innym kartom

Pomysły z burzy mózgów świadomie wyniesione poza Arsenał. Każdy musi wrócić w specu odpowiedniej karty i w opisie PR z tą kartą.

| Pomysł                                                                                                       | Karta docelowa   | Uwagi                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bugi (widok per projekt); później „Radar bugów” (wyszukiwanie wśród zamkniętych wpisów wszystkich projektów) | Projekty         | Pliki `Vault/Projects/<projekt>/bugs.md`. Radar dopiero po zebraniu kilkunastu zamkniętych wpisów (2026-11-14 jeden zamknięty wpis w jednym projekcie)                     |
| Baza wiedzy (drzewo, wyszukiwanie, tagi)                                                                     | Notatki          | Sekcja „Baza wiedzy NEXUS” już istnieje (commity `8126d34`…`64f9e76`). Arsenał dodaje tylko most z sekcji 5                                                                |
| Reguły MUST/SHOULD oraz checklista „bezpieczeństwo agenta w aplikacji”                                       | Kodeks (część B) | Checklista jako kolejny plik Kodeksu, odwołujący się do notatek `Knowledge/ai-security/` (ok. 20 notatek o injection, OWASP LLM, granicach narzędzi, HITL)                 |
| Rejestr reużycia z `Vault/tech-stack-wspolny.md`                                                             | Mapa             | Plik ma stabilny format (sekcja = technologia, tabela „Co / Gdzie działa / Można przenieść do”), ale jest nieaktualny od 2026-05-19. Parser raz w `lib/nexus/`, dwa widoki |

## 9. Poza zakresem v1 i pytania otwarte

**Poza zakresem v1:** dodawanie wpisów Arsenału do paczki kontekstu (A7), upload PDF z UI (A6), automatyczne wykrywanie wdrożenia skilla w repo, edycja skilli w aplikacji, powiązanie zasobu z projektem, postęp modułów i action items w kursach, koszty AI, słownik tagów z `tags.yaml`.

**Do sprawdzenia w planach:**

- Czy `nexus-kb-audit` lub inne skille NEXUS skanują cały `Vault/` i zobaczą `Vault/Arsenal/` (etap 2, przed migracją).
- Mapa scalania tagów (etap 1).
- Dokładna lista skilli globalnych do skopiowania do Vaulta i ich przypisania do projektów (etap 2, przegląd po projektach).
