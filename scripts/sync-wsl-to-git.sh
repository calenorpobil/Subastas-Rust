#!/usr/bin/env bash
# Sincroniza /home/carlos/web-subastas → ruta de proyecto Windows para git.
# Excluye lo que .gitignore de Next.js ignoraría + artefactos de build/cache.
# Uso: bash sync-wsl-to-git.sh [--dry-run]

set -euo pipefail

SRC="/home/carlos/web-subastas"
# Ruta Windows montada en WSL
DST="/mnt/c/Users/Carlos/Documents/proyectos/CodeCrypto/Subastas/web"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: $SRC no existe. Crea el proyecto primero." >&2
  exit 1
fi

mkdir -p "$DST"

RSYNC_ARGS=(
  -av
  --delete
  # Directorios generados / pesados
  --exclude=".next/"
  --exclude="out/"
  --exclude="build/"
  --exclude="dist/"
  # Dependencias
  --exclude="node_modules/"
  # Cache y herramientas
  --exclude=".turbo/"
  --exclude=".swc/"
  --exclude=".cache/"
  # Entorno
  --exclude=".env.local"
  --exclude=".env.*.local"
  # Git propio del proyecto WSL (el git está en Windows)
  --exclude=".git/"
  # Logs
  --exclude="npm-debug.log*"
  --exclude="yarn-debug.log*"
  --exclude="yarn-error.log*"
)

if [[ $DRY_RUN -eq 1 ]]; then
  RSYNC_ARGS+=(--dry-run)
  echo "[DRY-RUN] Simulando sincronización $SRC → $DST"
else
  echo "Sincronizando $SRC → $DST"
fi

rsync "${RSYNC_ARGS[@]}" "$SRC/" "$DST/"

echo "Listo."
