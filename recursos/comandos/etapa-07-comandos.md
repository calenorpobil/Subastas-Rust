# Etapa 7 — Comandos ejecutados

Implementación de la lógica del frontend (cliente de Anchor, contexto, providers
y páginas). Como en la etapa 6, **no se usa WSL**: solo interviene Node. Los
comandos se ejecutan desde `web/` salvo que se indique otra cosa.

> **Versiones de esta máquina:** Node 24.12.0, yarn 1.22.22, Next.js 16.2.9.

---

## 7.1 Copiar el tipo TypeScript generado al frontend

A diferencia de la etapa 6 (que copió el **IDL JSON**), aquí se copia el **tipo
TS** que genera Anchor (`target/types/subastas.ts`). Da un `Program<Subastas>`
tipado, con autocompletado de métodos y cuentas.

```bash
# Git Bash — desde web/
mkdir -p src/idl
cp ../subastas/target/types/subastas.ts src/idl/subastas.ts
```

Equivalente en PowerShell:

```powershell
New-Item -ItemType Directory -Force src\idl
Copy-Item ..\subastas\target\types\subastas.ts src\idl\subastas.ts
```

> Repetir este paso **cada vez** que se recompile el programa y cambie la API.

---

## 7.2 Ficheros creados/editados (sin comando — edición directa)

- `src/lib/anchor.ts` — `getProgram`, `PROGRAM_ID`, `CONNECTION`, `ENDPOINT`.
- `src/lib/subastas.ts` — operaciones: `getSubastas`, `getSubasta`, `getPujas`,
  `crearSubasta`, `iniciarSubasta`, `crearPuja`, `finalizarSubasta`, helpers de
  PDA y `estadoLabel`.
- `src/context/GlobalContext.tsx` — mantiene la wallet conectada.
- `src/components/Providers.tsx` — providers de Connection/Wallet/WalletModal +
  `GlobalProvider`, con un `WalletSync` que vuelca la wallet al contexto.
- `src/app/layout.tsx` — usa `<Providers>` (sigue siendo Server Component).
- `src/components/Header.tsx` — `WalletMultiButton` con `ssr:false`.
- `src/app/page.tsx` — listado + formulario de creación.
- `src/app/subasta/[id]/page.tsx` — detalle, ganador, pujas e
  iniciar/pujar/finalizar.

> **Desviaciones respecto al guion (intencionadas, según la implementación real
> del programa):**
> - `crearPuja` **no** envía `ts`: el programa solo acepta `id` e
>   `importe_puja` y pone el timestamp on-chain.
> - `estado` es un `u8` (número), no un `BN` → se trata como número.
> - Fechas en **segundos** (unix timestamp), no milisegundos (`Clock::get`).
> - Providers separados en un componente cliente `Providers` para no romper la
>   `metadata` del `layout.tsx`.
> - Wallet tipada como `AnchorWallet` (wallet-adapter), no `anchor.Wallet`.

---

## 7.3 Verificar que compila

```bash
# desde web/
yarn build
```

Resultado esperado:

```
▲ Next.js 16.2.9 (webpack)
✓ Compiled successfully
  Finished TypeScript ...
Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /subasta/[id]
```

---

## 7.4 Incidencia: disco lleno (ENOSPC)

Durante el build el disco se quedó sin espacio (0.24 GB libres) y fallaba con
`ENOSPC`. Se liberó borrando el ledger del validador local (regenerable al
relanzar `solana-test-validator`):

```powershell
Remove-Item -Recurse -Force ..\subastas\test-ledger -Confirm:$false
```

Comprobar espacio libre:

```powershell
Get-PSDrive C | Select-Object @{N="FreeGB";E={[math]::Round($_.Free/1GB,2)}}
```

---

## 7.5 Probar en vivo (requiere validador + programa desplegado)

`anchor`/`solana` viven en **WSL** en esta máquina. Con el validador local en
marcha y el programa desplegado:

```bash
# desde web/ (Node de Windows)
yarn dev
```

Luego conectar Phantom a `http://localhost:8899` (paso manual de la etapa 6.7).
