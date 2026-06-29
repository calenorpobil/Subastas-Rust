# Etapa 1 — Preparación del entorno

## Objetivo
Tener todas las herramientas instaladas y verificadas antes de escribir una sola línea de código del proyecto.

---

## Pasos

### 1.1 Instalar Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

- Seguir las instrucciones del instalador (opción por defecto es suficiente).
- Reiniciar la terminal o ejecutar `source $HOME/.cargo/env`.

**Verificar:**
```bash
rustc --version
cargo --version
```

---

### 1.2 Instalar Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

- Añadir la ruta de Solana al `PATH` si el instalador lo indica.

**Verificar:**
```bash
solana --version
```

---

### 1.3 Instalar Anchor (vía AVM)

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

**Verificar:**
```bash
anchor --version
```

---

### 1.4 Instalar Node.js y Yarn

- Descargar e instalar Node.js desde [https://nodejs.org/](https://nodejs.org/) (versión LTS recomendada).

```bash
npm install -g yarn
```

**Verificar:**
```bash
node --version
yarn --version
```

---

### 1.5 Instalar la extensión Phantom

- Instalar la extensión **Phantom** en el navegador (Chrome, Brave o Firefox).
- Crear una nueva wallet o importar una existente.
- Guardar la frase semilla en un lugar seguro.

---

### 1.6 Configurar la Solana CLI para localnet

```bash
solana config set --url localhost
```

Crear una wallet de desarrollo local (si no existe):
```bash
solana-keygen new
```

Verificar la configuración:
```bash
solana config get
```

La salida debe mostrar `RPC URL: http://localhost:8899`.

---

### 1.7 Verificación final conjunta

Ejecutar todos los comandos de versión de una vez para confirmar que todo está listo:

```bash
rustc --version
cargo --version
solana --version
anchor --version
node --version
yarn --version
```

---

## Criterio de éxito

- [ ] `rustc`, `cargo`, `solana`, `anchor`, `node` y `yarn` responden con sus versiones.
- [ ] La CLI de Solana apunta a `localhost`.
- [ ] Phantom instalado y con una cuenta creada.
- [ ] Existe un keypair local (`~/.config/solana/id.json`).
