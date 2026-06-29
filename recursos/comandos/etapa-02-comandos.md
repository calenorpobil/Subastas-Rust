# Etapa 2 — Comandos ejecutados

Todos los comandos se ejecutan dentro de **WSL** con shell de login.

---

## Verificar el toolchain

```bash
rustc --version
cargo --version
solana --version
anchor --version
node --version
yarn --version
```

---

## Activar NVM e instalar Node.js en WSL

Solo necesario si Node.js no está disponible en WSL.

```bash
source ~/.nvm/nvm.sh
nvm install --lts
nvm use --lts
npm install -g yarn
```

---

## Crear el proyecto Anchor

Ejecutar desde el directorio raíz del repo (`Subastas/`).

```bash
anchor init subastas
cd subastas
```

---

## Compilar el programa

Primera compilación tarda ~20 minutos (descarga y compila todas las dependencias de Cargo).
Las siguientes compilaciones tardan segundos.

```bash
anchor build
```

---

## Ejecutar los tests

```bash
anchor test
```

Equivalente a `anchor build` + `cargo test`. Si el `.so` ya está compilado,
se puede saltar el build de release con:

```bash
cargo test
```

---

## Resultado esperado

```
test test_id         ... ok
test test_initialize ... ok

test result: ok. 2 passed; 0 failed
```
