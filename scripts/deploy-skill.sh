#!/usr/bin/env bash
# Wdraża skill z Vaulta (Arsenal/Skills/<slug>/) do repozytorium projektu: <projekt>/.claude/skills/<slug>/.
# Użycie: scripts/deploy-skill.sh <slug> <katalog-projektu> [--force]
# Uruchamia użytkownik (Monolith tylko generuje to polecenie). Vault: $NEXUS_VAULT_PATH (ścieżka POSIX)
# albo ~/projects/Brain_7224/NEXUS/Vault.
# Kody wyjścia: 0 ok, 1 użycie, 2 zły slug, 3 brak skilla lub katalogu projektu, 4 cel istnieje (bez --force).
set -euo pipefail

usage() { echo "Użycie: $0 <slug> <katalog-projektu> [--force]" >&2; exit 1; }

FORCE=0
ARGS=()
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
[[ ${#ARGS[@]} -eq 2 ]] || usage

SLUG="${ARGS[0]}"
TARGET="${ARGS[1]}"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "Nieprawidłowy slug: $SLUG" >&2; exit 2; }

VAULT="${NEXUS_VAULT_PATH:-$HOME/projects/Brain_7224/NEXUS/Vault}"
# Tylko `~` i `~/...` (nie `~user`).
if [[ "$TARGET" == "~" || "$TARGET" == "~/"* ]]; then TARGET="$HOME${TARGET#\~}"; fi
SRC="$VAULT/Arsenal/Skills/$SLUG"
[[ -f "$SRC/skill.md" ]] || { echo "Brak skilla: $SRC/skill.md" >&2; exit 3; }
[[ -d "$TARGET" ]] || { echo "Brak katalogu projektu: $TARGET" >&2; exit 3; }

DEST="$TARGET/.claude/skills/$SLUG"
if [[ -e "$DEST/SKILL.md" && $FORCE -ne 1 ]]; then
  echo "Cel już istnieje: $DEST/SKILL.md (użyj --force, by nadpisać)" >&2
  exit 4
fi
mkdir -p -- "$DEST"

# Frontmatter: usuwamy klucze tylko-Vaultowe (type, slug, summary, origin, source_path, deployed) razem z ich
# wcięciami/listą; reszta (name, description, ...) i treść zostają. CRLF jest sprowadzany do LF
# (jak robi to Monolith przy odczycie), żeby plik edytowany w Windows nie ominął filtra.
tr -d '\r' < "$SRC/skill.md" | awk '
  NR == 1 && $0 == "---" { infm = 1; print; next }
  infm && $0 == "---" { infm = 0; skip = 0; print; next }
  infm {
    if ($0 ~ /^(type|slug|summary|origin|source_path|deployed):/) { skip = 1; next }
    if (skip && ($0 ~ /^[[:space:]]/ || $0 ~ /^-/)) next
    skip = 0
  }
  { print }
' > "$DEST/SKILL.md"

# Szablony wracają obok SKILL.md (taki układ miały oryginalne skille).
if [[ -d "$SRC/templates" ]]; then
  cp -R -- "$SRC/templates/." "$DEST/"
fi

echo "Wdrożono: $DEST"
echo "Teraz w Arsenale kliknij „Oznacz jako wdrożone”."
