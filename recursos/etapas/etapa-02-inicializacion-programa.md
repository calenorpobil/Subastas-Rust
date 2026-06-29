# Etapa 2 — Inicialización del programa Solana

## Objetivo
Generar el esqueleto del proyecto Anchor y entender la estructura de ficheros que crea.

---

## Pasos

### 2.1 Crear el proyecto con Anchor

```bash
anchor init subastas
cd subastas
```

Anchor genera automáticamente la estructura de directorios y ficheros necesarios.

---

### 2.2 Explorar la estructura generada

```
subastas/
├── programs/
│   └── subastas/
│       └── src/
│           └── lib.rs          ← Programa principal (aquí irá toda la lógica)
├── tests/
│   └── subastas.ts             ← Tests automatizados del programa
├── target/
│   └── idl/                    ← IDL generado al compilar (aún vacío)
├── Anchor.toml                 ← Configuración de Anchor y Program ID
├── Cargo.toml                  ← Dependencias de Rust
└── package.json                ← Dependencias de Node (para los tests)
```

**Comprender cada fichero clave:**

- **`lib.rs`**: es el corazón del proyecto. Contendrá las estructuras de datos, las instrucciones, los contextos de validación y los errores personalizados.
- **`Anchor.toml`**: declara el nombre del programa y su Program ID. Hay que mantenerlo sincronizado con `lib.rs`.
- **`tests/subastas.ts`**: los tests automatizados que verifican las instrucciones del programa.

---

### 2.3 Revisar el `lib.rs` generado

Abrir `programs/subastas/src/lib.rs`. Anchor genera un programa de ejemplo mínimo:

```rust
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod subastas {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
```

Identificar:
- `declare_id!`: contiene el Program ID. Se actualizará en la Etapa 4.
- `#[program]`: módulo donde se declaran las instrucciones.
- `#[derive(Accounts)]`: contexto de validación de cuentas de una instrucción.

---

### 2.4 Revisar el `Anchor.toml` generado

```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
subastas = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

Comprobar que `cluster = "Localnet"` y que `wallet` apunta al keypair creado en la Etapa 1.

---

### 2.5 Instalar dependencias de Node

```bash
yarn install
```

Esto instala las dependencias necesarias para ejecutar los tests (Anchor client, Mocha, Chai, etc.).

---

## Criterio de éxito

- [ ] La carpeta `subastas/` existe con la estructura completa.
- [ ] `lib.rs` tiene el esqueleto generado por Anchor.
- [ ] `Anchor.toml` apunta a `Localnet` y al keypair correcto.
- [ ] `yarn install` finaliza sin errores.
