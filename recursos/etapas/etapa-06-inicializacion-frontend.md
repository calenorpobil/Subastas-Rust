# Etapa 6 — Inicialización del frontend

## Objetivo
Crear el proyecto Next.js, instalar todas las dependencias necesarias para interactuar con Solana y estructurar el proyecto frontend antes de escribir la lógica.

---

## Pasos

### 6.1 Crear el proyecto Next.js

Desde la raíz del monorepo (carpeta que contiene `subastas/`):

```bash
npx create-next-app@latest web
```

Opciones recomendadas durante la creación:
- TypeScript: **Sí**
- ESLint: **Sí**
- Tailwind CSS: **Sí**
- Directorio `src/`: **No** (mantener estructura plana)
- App Router: **Sí** (Next.js 15)
- Importaciones con alias `@/*`: **Sí**

```bash
cd web
```

---

### 6.2 Instalar dependencias de Solana y Anchor

```bash
yarn add @coral-xyz/anchor @solana/web3.js
```

**Wallet adapter de Phantom:**
```bash
yarn add @solana/wallet-adapter-base \
         @solana/wallet-adapter-react \
         @solana/wallet-adapter-react-ui \
         @solana/wallet-adapter-phantom
```

---

### 6.3 Resolver problemas de bundler (Next.js / Webpack)

Next.js 15 con App Router puede tener conflictos con las dependencias de Solana porque algunas usan APIs de Node.js no disponibles en el navegador. Añadir la siguiente configuración en `next.config.ts` (o `next.config.js`):

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
        };
        return config;
    },
};

export default nextConfig;
```

---

### 6.4 Copiar el IDL al frontend

El IDL describe la interfaz del programa. El cliente de Anchor lo necesita para construir las llamadas.

```bash
# Desde la raíz del monorepo:
cp subastas/target/idl/subastas.json web/src/idl/subastas.json
```

Crear la carpeta `src/idl/` si no existe. Este paso debe repetirse **cada vez** que se recompile el programa y cambie el IDL.

---

### 6.5 Estructura de carpetas del frontend

Crear la siguiente estructura dentro de `web/src/`:

```
web/src/
├── app/
│   ├── layout.tsx          ← Layout principal (providers, header, footer)
│   ├── page.tsx            ← Página de inicio (listado de subastas)
│   └── subasta/
│       └── [id]/
│           └── page.tsx    ← Página de detalle de una subasta
├── context/
│   └── GlobalContext.tsx   ← Estado global (wallet conectada)
├── components/
│   ├── Header.tsx
│   └── Footer.tsx
└── idl/
    └── subastas.json       ← IDL copiado del programa
```

---

### 6.6 Verificar que el proyecto arranca

```bash
yarn dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador. Debe mostrar la página de inicio de Next.js (o la página vacía del proyecto).

---

### 6.7 Configurar Phantom para localnet

En la extensión Phantom del navegador:
1. Abrir configuración → **Cambiar red**.
2. Seleccionar **Localhost** (o añadir manualmente `http://localhost:8899`).
3. Importar la cuenta de desarrollo local (usando el keypair de `~/.config/solana/id.json`) para tener SOL de prueba.

---

## Criterio de éxito

- [ ] El proyecto `web/` existe y arranca con `yarn dev`.
- [ ] Las dependencias de Anchor y Solana están instaladas.
- [ ] `next.config.ts` tiene los fallbacks de Webpack configurados.
- [ ] `src/idl/subastas.json` existe y contiene el IDL del programa.
- [ ] La estructura de carpetas está creada.
- [ ] Phantom apunta a Localhost.
