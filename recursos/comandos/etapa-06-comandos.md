# Etapa 6 — Comandos ejecutados

Inicialización del frontend. A diferencia de las etapas del programa, aquí
**no se usa WSL**: el toolchain de Solana no interviene, solo Node. Los comandos
se ejecutan con el **Node de Windows** (PowerShell o Git Bash), desde la raíz
del monorepo (`Subastas/`, la carpeta que contiene `subastas/`).

> **Versiones de esta máquina:** Node 24.12.0, npm 11.9.0, yarn 1.22.22.
> `create-next-app` instaló **Next.js 16.2.9** (más reciente que el que asume la
> etapa). Esto obliga a un par de ajustes respecto al guion original, anotados
> abajo.

---

## 6.1 Crear el proyecto Next.js

Creación no interactiva (se pasan todas las opciones por flag). Se activó el
directorio `src/` para que coincida con la estructura detallada de los pasos 6.4
y 6.5 (el texto del 6.1 decía "No", pero el resto del documento usa `web/src/`).
Se añadió `--no-turbopack` porque la etapa usa configuración de Webpack.

```bash
# Node de Windows — desde la raíz del monorepo
npx --yes create-next-app@latest web \
  --typescript --eslint --tailwind --src-dir --app \
  --import-alias "@/*" --use-yarn --no-turbopack --yes

cd web
```

---

## 6.2 Instalar dependencias de Solana y Anchor

```bash
yarn add @coral-xyz/anchor @solana/web3.js

yarn add @solana/wallet-adapter-base \
         @solana/wallet-adapter-react \
         @solana/wallet-adapter-react-ui \
         @solana/wallet-adapter-phantom
```

Versiones instaladas: `@coral-xyz/anchor` 0.32.1, `@solana/web3.js` 1.98.4
(la línea v1 legacy, que sí necesita los fallbacks de Node del paso 6.3).

---

## 6.3 Resolver problemas de bundler

Se añadieron los fallbacks de Webpack (`fs`/`net`/`tls`) en `web/next.config.ts`.

> **Ajuste por Next.js 16:** Next 16 usa **Turbopack por defecto**, que *ignora*
> la clave `webpack` de la config. Para que los fallbacks se apliquen de verdad,
> los scripts `dev` y `build` se cambiaron a modo webpack en `web/package.json`:
>
> ```jsonc
> "dev":   "next dev --webpack",
> "build": "next build --webpack",
> ```

---

## 6.4 Copiar el IDL al frontend

`cp` no existe igual en PowerShell; con Git Bash es directo. Desde `web/`:

```bash
# Git Bash — desde web/
mkdir -p src/idl
cp ../subastas/target/idl/subastas.json src/idl/subastas.json
```

Equivalente en PowerShell:

```powershell
New-Item -ItemType Directory -Force src\idl
Copy-Item ..\subastas\target\idl\subastas.json src\idl\subastas.json
```

> Repetir este paso **cada vez** que se recompile el programa y cambie el IDL.

---

## 6.5 Crear la estructura de carpetas

```bash
# Git Bash — desde web/src
mkdir -p idl context components "app/subasta/[id]"
```

Ficheros creados/editados (stubs; la lógica llega en la etapa 07):
`app/layout.tsx`, `app/page.tsx`, `app/subasta/[id]/page.tsx`,
`context/GlobalContext.tsx`, `components/Header.tsx`, `components/Footer.tsx`.

> **Ajuste por Next.js 16:** en las rutas dinámicas `params` es una `Promise`;
> `app/subasta/[id]/page.tsx` hace `const { id } = await params`.

---

## 6.6 Verificar que el proyecto arranca

```bash
# Comprobar tipos
npx tsc --noEmit

# Arrancar el servidor de desarrollo (modo webpack)
yarn dev
```

Verificación rápida sin navegador:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/subasta/7
```

---

## 6.7 Configurar Phantom para localnet

Paso **manual** en la extensión del navegador (no automatizable):
cambiar la red a `http://localhost:8899` e importar el keypair de desarrollo
(`~/.config/solana/id.json`) para tener SOL de prueba.

---

## Resultado esperado

```
▲ Next.js 16.2.9 (webpack)
- Local:   http://localhost:3000
✓ Ready in ~1.5s
```

- `npx tsc --noEmit` termina sin errores.
- `GET /` y `GET /subasta/7` devuelven **HTTP 200**.
```
