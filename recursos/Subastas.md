# Documento de Desarrollo — Sistema de Subastas Descentralizado en Solana

> **Proyecto:** `solana-subasta`
> **Tipo:** Aplicación descentralizada (dApp) full-stack
> **Componentes:** Programa Solana (Rust + Anchor) + Frontend web (Next.js + React)
> **Entorno de referencia:** Localnet (validador local). Devnet opcional.
> **Estado del documento:** Documento de desarrollo / diseño técnico

---

## Índice

1. [Propósito del documento](#1-propósito-del-documento)
2. [Descripción general del proyecto](#2-descripción-general-del-proyecto)
3. [Objetivos](#3-objetivos)
4. [Alcance](#4-alcance)
5. [Requisitos](#5-requisitos)
6. [Stack tecnológico y herramientas](#6-stack-tecnológico-y-herramientas)
7. [Arquitectura del sistema](#7-arquitectura-del-sistema)
8. [Diseño del programa Solana (smart contract)](#8-diseño-del-programa-solana-smart-contract)
9. [Diseño del frontend web](#9-diseño-del-frontend-web)
10. [Modelo de datos y persistencia](#10-modelo-de-datos-y-persistencia)
11. [Fases de desarrollo](#11-fases-de-desarrollo)
12. [Configuración del entorno](#12-configuración-del-entorno)
13. [Compilación, IDL y despliegue](#13-compilación-idl-y-despliegue)
14. [Estrategia de pruebas](#14-estrategia-de-pruebas)
15. [Despliegue en Devnet (opcional)](#15-despliegue-en-devnet-opcional)
16. [Errores comunes y resolución](#16-errores-comunes-y-resolución)
17. [Roadmap y ejercicios propuestos](#17-roadmap-y-ejercicios-propuestos)
18. [Glosario](#18-glosario)
19. [Referencias](#19-referencias)

---

## 1. Propósito del documento

Este documento describe el diseño y el plan de desarrollo de una aplicación descentralizada de subastas sobre la blockchain de Solana. Sirve como referencia técnica para implementar el proyecto desde cero, comprender sus componentes y reproducir el flujo completo de desarrollo, pruebas y despliegue.

El proyecto está concebido como un **ejercicio práctico de aprendizaje**: la guía y el código de referencia existen, pero la finalidad es que cada desarrollador construya su propia versión apoyándose en un editor con asistencia de inteligencia artificial (Cursor, GitHub Copilot, Claude Code u otro). El objetivo no es solo obtener el código funcionando, sino **comprenderlo en profundidad**.

---

## 2. Descripción general del proyecto

`solana-subasta` es una **dApp** que permite crear y gestionar subastas íntegramente sobre la blockchain de Solana, sin base de datos tradicional. Toda la información (subastas y pujas) se almacena en cuentas de Solana.

Funcionalidad principal:

- Un usuario **crea una subasta** con parámetros personalizados (nombre, descripción, importe mínimo, fecha de inicio y fecha de fin).
- El creador puede **iniciar** la subasta (cambio de estado).
- Cualquier usuario conectado puede **realizar pujas** sobre subastas activas.
- El sistema **determina automáticamente el ganador** (la puja más alta) y permite **finalizar** la subasta.
- La interfaz web muestra el listado de subastas, el detalle de cada una, el ganador actual y el histórico de pujas.

El sistema se compone de dos piezas que trabajan juntas:

1. **Programa de Solana** (la lógica de negocio en cadena, escrita en Rust con Anchor).
2. **Frontend web** (la interfaz de usuario que construye y firma transacciones, escrita en Next.js + React, con la wallet Phantom).

> **Nota terminológica:** en el ecosistema Solana es habitual hablar de "smart contract", pero el término correcto es **programa** (*program*). En este documento se usan ambos como sinónimos, prefiriendo "programa Solana".

---

## 3. Objetivos

### 3.1 Objetivos de aprendizaje (blockchain)

Al completar el proyecto, el desarrollador será capaz de:

- Comprender la **arquitectura de programas de Solana**.
- Trabajar con **PDAs** (Program Derived Addresses), una de las claves del desarrollo en Solana.
- Implementar **instrucciones** y **validaciones** dentro de un programa.
- Gestionar **cuentas** y el **estado** en Solana.
- Manejar **errores personalizados**.

### 3.2 Objetivos de aprendizaje (frontend)

- Construir aplicaciones con **Next.js 15** y **React 19**.
- Integrar una **wallet de Solana** (Phantom).
- Interactuar con la red de Solana desde el frontend.
- Gestionar el **estado global** con la Context API.
- Diseñar la interfaz con **Tailwind CSS**.

### 3.3 Objetivos funcionales

- Crear subastas con parámetros personalizados.
- Realizar pujas sobre subastas activas.
- Visualizar el ganador (puja más alta).
- Finalizar la subasta y determinar el ganador definitivo.

---

## 4. Alcance

**Incluido:**

- Programa Solana con cuatro instrucciones: `crear_subasta`, `iniciar_subasta`, `crear_puja`, `finalizar_subasta`.
- Cuentas para subastas y pujas, basadas en PDAs.
- Frontend web con listado, detalle, creación de subastas y mecanismo de pujas.
- Pruebas automatizadas del programa y pruebas manuales de la aplicación.
- Despliegue en **localnet** (validador local). Suficiente para desarrollo y demostración.

**Opcional / fuera del alcance mínimo:**

- Despliegue en **Devnet**.
- Bloqueo de SOL real en las pujas, reembolsos, finalización automática por tiempo, marketplace, NFTs como premio, integración con oráculos, función "comprar ya". (Ver [Roadmap](#17-roadmap-y-ejercicios-propuestos).)

---

## 5. Requisitos

### 5.1 Requisitos funcionales

| ID | Requisito |
|----|-----------|
| RF-01 | El usuario puede conectar su wallet (Phantom). |
| RF-02 | El usuario puede crear una subasta con nombre, descripción, importe mínimo, fecha de inicio y fecha de fin. |
| RF-03 | El creador puede iniciar la subasta (estado 0 → 1). |
| RF-04 | Un usuario puede pujar en una subasta activa indicando un importe. |
| RF-05 | El sistema actualiza el ganador si la nueva puja supera la puja ganadora actual. |
| RF-06 | El sistema rechaza pujas si la subasta ya ha finalizado. |
| RF-07 | El sistema limita a **una puja por usuario y subasta** (derivado del diseño de la PDA de puja). |
| RF-08 | El usuario puede ver el listado de subastas y el detalle de cada una (ganador y pujas). |
| RF-09 | La subasta puede finalizarse (estado → 2). |

### 5.2 Requisitos no funcionales / técnicos (hardware)

- Memoria RAM: **8 GB como mínimo**.
- Procesador: equivalente a **Intel i5** o superior.
- Disco: espacio suficiente para las toolchains de Rust, Solana y Node.
- Conexión a internet estable.

### 5.3 Requisitos de software

- **Rust** (toolchain).
- **Solana CLI**.
- **Anchor** (framework) gestionado con **AVM**.
- **Node.js** y **Yarn**.
- Extensión de navegador **Phantom** (wallet).
- Editor con asistente de IA (Cursor, VS Code + Copilot, Claude Code, etc.). El código debe desarrollarse apoyándose en IA.

### 5.4 Conocimientos previos recomendados

**Esenciales:**

- TypeScript / JavaScript (sintaxis básica).
- React y Next.js.
- Conceptos de blockchain: transacciones, cuentas, wallets, comandos básicos.
- Conceptos de Solana: lamports, PDA, rent (alquiler), estructura de programas.
- Rust básico: estructuras (`struct`), funciones.

**Útiles:**

- CSS / Tailwind para maquetación y estilos.

---

## 6. Stack tecnológico y herramientas

### Backend (en cadena)

| Tecnología | Uso |
|------------|-----|
| **Rust** | Lenguaje del programa Solana. |
| **Anchor** | Framework que simplifica el desarrollo: serialización, validación de cuentas, gestión de errores, generación del IDL. |
| **Solana CLI** | Herramientas de línea de comandos (build, deploy, airdrop, config, validador). |
| **solana-test-validator** | Blockchain local para desarrollo (localnet). |

### Frontend / testing

| Tecnología | Uso |
|------------|-----|
| **Next.js 15** | Framework web. |
| **React 19** | Construcción de la interfaz. |
| **Anchor Client (TypeScript)** | Cliente para interactuar con el programa desde JS/TS. |
| **@solana/web3.js** | Acceso a la red de Solana. |
| **Phantom** | Wallet del usuario (firma de transacciones). |
| **Context API** | Gestión del estado global (wallet/usuario). |
| **Tailwind CSS** | Estilos. |
| **Mocha / Chai** | Tests del programa. |

---

## 7. Arquitectura del sistema

### 7.1 Visión general

```
 ┌──────────────────────────┐         ┌──────────────────────────────┐
 │   Usuario (navegador)     │        │       Blockchain Solana       │
 │                          │         │                              │
 │  ┌────────────────────┐  │         │  ┌────────────────────────┐  │
 │  │   Frontend (Next)  │  │  RPC    │  │   Programa Solana       │  │
 │  │  - Listado         │◄─┼─────────┼─►│  (Rust + Anchor)        │  │
 │  │  - Detalle         │  │ web3.js │  │                        │  │
 │  │  - Crear / Pujar   │  │         │  │  Instrucciones:        │  │
 │  └─────────┬──────────┘  │         │  │   crear_subasta        │  │
 │            │             │         │  │   iniciar_subasta      │  │
 │  ┌─────────▼──────────┐  │         │  │   crear_puja           │  │
 │  │  Phantom (wallet)  │──┼─firma──►│  │   finalizar_subasta    │  │
 │  └────────────────────┘  │         │  │                        │  │
 │                          │         │  │  Cuentas (PDA):        │  │
 └──────────────────────────┘         │  │   Subasta, Puja        │  │
                                       │  └────────────────────────┘  │
                                       └──────────────────────────────┘
```

### 7.2 Componentes clave

Un programa de Solana se compone de:

- Un **Program ID** (identificador único del programa).
- Una serie de **instrucciones** (las operaciones públicas accesibles desde los clientes).
- Una serie de **cuentas** que las instrucciones leen y modifican.

En este proyecto:

- **Cuentas:** `Subasta` y `Puja`.
- **Instrucciones:** `crear_subasta`, `iniciar_subasta`, `crear_puja`, `finalizar_subasta`.

### 7.3 Flujo de datos

1. El usuario **conecta** su wallet Phantom.
2. El frontend **lista** las subastas existentes consultando el programa.
3. El usuario **crea** una subasta (o lanza una puja).
4. El frontend **construye** la transacción.
5. **Phantom firma** la transacción.
6. La transacción **se envía** a Solana.
7. El **programa ejecuta** la instrucción correspondiente.
8. El **estado se actualiza** en la blockchain.
9. El frontend **refresca** los datos.

---

## 8. Diseño del programa Solana (smart contract)

Todo el programa reside en un único fichero `lib.rs` que contiene: la declaración del Program ID, las instrucciones, las estructuras de datos, los contextos (validación de cuentas) y los errores personalizados.

### 8.1 Estructuras de datos

**`Subasta`** — representa una subasta:

```rust
#[account]
#[derive(InitSpace)]
pub struct Subasta {
    pub id: u64,                 // Identificador único
    #[max_len(32)]
    pub nombre: String,          // Nombre de la subasta
    #[max_len(64)]
    pub descripcion: String,     // Descripción
    pub importe_minimo: u64,     // Precio inicial / mínimo
    pub fecha_inicio: u64,       // Timestamp de inicio
    pub fecha_fin: u64,          // Timestamp de finalización
    pub estado: u64,             // 0=creada, 1=iniciada, 2=finalizada
    pub creador: Pubkey,         // Dirección del creador
    pub ganador: Pubkey,         // Dirección del ganador actual
    pub importe_ganador: u64,    // Puja más alta hasta el momento
}
```

**`Puja`** — representa una oferta de un usuario:

```rust
#[account]
#[derive(InitSpace)]
pub struct Puja {
    pub id: u64,             // Id de la subasta a la que pertenece
    pub importe_puja: u64,   // Importe ofertado
    pub ts: u64,             // Timestamp de la puja
    pub pk: Pubkey,          // Dirección del usuario que puja
}
```

Notas:

- `#[account]` marca la estructura como una cuenta de Solana.
- `u64` es un entero sin signo de 64 bits; `Pubkey` es una dirección pública.
- `#[max_len(n)]` acota el tamaño de los `String` para poder calcular el espacio de la cuenta.

### 8.2 PDAs y semillas (seeds)

Las cuentas se direccionan mediante **PDAs**: direcciones únicas generadas de forma determinista a partir de semillas. No tienen clave privada; solo el programa puede firmar por ellas.

| Cuenta | Semillas | Resultado |
|--------|----------|-----------|
| `Subasta` | `[b"subasta", id.to_le_bytes()]` | Una PDA única por cada `id` de subasta. |
| `Puja` | `[b"puja", id.to_le_bytes(), user.key()]` | Una PDA única por cada par (subasta, usuario). |

Implicaciones del diseño:

- El `id` se transforma a bytes con `to_le_bytes()` para usarlo como semilla → cada subasta tiene una dirección única basada en su id.
- La PDA de puja combina el id de la subasta **y** la clave del usuario → genera una dirección única por usuario y subasta, lo que **limita a una puja por usuario en cada subasta**.

> **Limpieza recomendada:** en el código de referencia las constantes aparecen como `"subasta33"` y `"puja2222"`. Esos sufijos numéricos son restos de pruebas y no aportan nada: pueden simplificarse a `"subasta"` y `"puja"`.

### 8.3 Instrucciones

| Instrucción | Descripción |
|-------------|-------------|
| `crear_subasta` | Inicializa la cuenta `Subasta` con los parámetros recibidos y la deja en estado `0` (creada). |
| `iniciar_subasta` | Cambia el estado a `1` (iniciada). |
| `crear_puja` | Crea/actualiza una `Puja`; si el importe supera al ganador actual, actualiza `ganador` e `importe_ganador` en la subasta. Valida que la subasta no haya finalizado. |
| `finalizar_subasta` | Cambia el estado a `2` (finalizada); el ganador queda determinado de forma definitiva. |

**Lógica de `crear_puja` (núcleo del negocio):**

```rust
pub fn crear_puja(
    ctx: Context<CrearPujaContext>,
    id: u64,
    importe_puja: u64,
    ts: u64
) -> Result<()> {
    let puja = &mut ctx.accounts.puja;
    let subasta = &mut ctx.accounts.subasta;

    // 1) Si la puja supera la ganadora actual, actualiza el ganador
    if importe_puja > subasta.importe_ganador {
        subasta.ganador = *ctx.accounts.user.key;
        subasta.importe_ganador = importe_puja;
    }

    // 2) Verifica que la subasta no haya terminado
    require!(ts < subasta.fecha_fin, SubastasError::SubastaYaFinalizada);

    // 3) Guarda los datos de la puja
    puja.id = id;
    puja.importe_puja = importe_puja;
    puja.ts = ts;
    puja.pk = *ctx.accounts.user.key;
    Ok(())
}
```

### 8.4 Contextos y validación de cuentas

Cada instrucción define un **contexto** que declara qué cuentas necesita y cómo se validan. Ejemplo para crear una subasta:

```rust
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CrearSubastaContext<'info> {
    #[account(
        init,                                 // Anchor crea la cuenta
        payer = user,                         // Quién paga el rent
        space = 8 + Subasta::INIT_SPACE,      // Espacio necesario
        seeds = [b"subasta", id.to_le_bytes().as_ref()],
        bump
    )]
    pub subasta: Account<'info, Subasta>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
```

### 8.5 Cálculo del espacio de la cuenta

El espacio se declara como `8 + <tamaño real>`:

- Los **8 bytes** iniciales son el **discriminador** de Anchor (identifica el tipo de cuenta).
- El tamaño real lo calcula Anchor mediante la constante `INIT_SPACE` (derivada de `#[derive(InitSpace)]` y de los `#[max_len]`).

### 8.6 Estados de la subasta

| Valor | Estado |
|-------|--------|
| `0` | Creada (no iniciada) |
| `1` | Iniciada (admite pujas) |
| `2` | Finalizada (ganador definitivo) |

### 8.7 Errores personalizados

```rust
#[error_code]
pub enum SubastasError {
    #[msg("La subasta ya ha sido iniciada")]
    SubastaYaIniciada,
    #[msg("La subasta no ha sido iniciada")]
    SubastaNoIniciada,
    #[msg("La subasta ya ha sido finalizada")]
    SubastaYaFinalizada,
    // ... más errores según validaciones
}
```

---

## 9. Diseño del frontend web

El frontend es una aplicación Next.js/React que actúa como cliente del programa Solana. Su responsabilidad es leer el estado de la blockchain, construir transacciones y delegar la firma en Phantom.

### 9.1 Estructura y piezas principales

- **Global Context (`GlobalContext`)**: mantiene el estado global de la aplicación, principalmente la **wallet** conectada (equivalente al "usuario conectado"). Es un patrón habitual en apps web.
- **`layout.tsx` / Providers**: envuelve la aplicación con los proveedores necesarios (incluido el contexto global y el proveedor de wallet).
- **Página de inicio (home)**: muestra el **listado de subastas**.
- **Página de detalle**: muestra una subasta concreta, su **ganador** y el **histórico de pujas**.
- **Header / Footer**: estructura común de la interfaz.

### 9.2 Conexión con el programa: el IDL

El **IDL** (`target/idl/subastas.json`) describe la interfaz del programa: sus instrucciones (`crear_subasta`, `crear_puja`, `iniciar_subasta`, `finalizar_subasta`) y sus tipos (`Subasta`, `Puja`). Es el equivalente al **ABI** en Ethereum/Solidity.

Tras compilar el programa, se **copia el IDL al frontend**, y el cliente de Anchor lo usa para tipar y construir las llamadas al programa de forma automática.

### 9.3 Operaciones del cliente

| Operación | Descripción |
|-----------|-------------|
| Crear el proxy/cliente | Conecta con el endpoint RPC de Solana (en local, el del validador). |
| Obtener subastas | Usa `getProgramAccounts` para recuperar todas las cuentas de subasta y luego se mapean/procesan. |
| Crear subasta | Construye y envía la transacción de `crear_subasta`. |
| Crear puja | Construye y envía la transacción de `crear_puja`. |
| Obtener pujas de una subasta | Consulta con filtros sobre `getProgramAccounts`. |
| Finalizar subasta | Envía la transacción de `finalizar_subasta`. |

### 9.4 Integración con la wallet (Phantom)

- Se integra la extensión **Phantom** del navegador.
- El usuario conecta su cuenta; el contexto global expone la wallet.
- Cada operación que modifica estado genera una transacción que **Phantom firma** antes de enviarse a la red.

---

## 10. Modelo de datos y persistencia

A diferencia de una aplicación web tradicional, **no existe base de datos externa** (MongoDB, SQL, etc.). Toda la información se almacena **en cuentas de Solana**:

- Cada **subasta** es una cuenta PDA `Subasta`.
- Cada **puja** es una cuenta PDA `Puja`.

Las consultas ("¿cuántas subastas hay?", "¿qué pujas tiene esta subasta?") se resuelven con `getProgramAccounts` y filtros, en lugar de consultas a una base de datos. Esto implica que la blockchain actúa simultáneamente como capa de lógica y de persistencia.

> En aplicaciones de mayor escala, parte de esta información podría indexarse en una base de datos externa para acelerar consultas; aquí se mantiene todo en cadena por simplicidad y propósito didáctico.

---

## 11. Fases de desarrollo

1. **Preparación del entorno**: instalar Rust, Solana CLI, Anchor (AVM), Node, Yarn y Phantom.
2. **Inicialización del programa**: `anchor init subastas` genera el esqueleto (incluido `lib.rs` y `Anchor.toml`).
3. **Implementación del programa**: estructuras de datos, instrucciones, contextos (validación de cuentas) y errores personalizados.
4. **Compilación y obtención del Program ID**: `anchor build`, actualización del Program ID en `lib.rs` y `Anchor.toml`, recompilación.
5. **Pruebas del programa**: tests automatizados con Anchor/Mocha sobre el validador local.
6. **Inicialización del frontend**: `create-next-app`, instalación de dependencias.
7. **Implementación del frontend**: contexto global, providers, páginas (listado y detalle), cliente de Anchor (copiar IDL), integración de Phantom.
8. **Pruebas manuales end-to-end**: crear subasta, iniciar, pujar (con varias cuentas), finalizar y verificar en Solana Explorer.
9. **(Opcional) Despliegue en Devnet**.

---

## 12. Configuración del entorno

### 12.1 Instalación de herramientas

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor (vía AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Node.js (desde https://nodejs.org/) + Yarn
npm install -g yarn
```

Verificación:

```bash
rustc --version
solana --version
anchor --version
node --version
yarn --version
```

### 12.2 Creación del proyecto

```bash
# Programa Solana (genera esqueleto con lib.rs y Anchor.toml)
anchor init subastas

# Frontend (Next.js 15)
npx create-next-app@latest web
# Instalar dependencias del frontend (Anchor client, @solana/web3.js,
# wallet adapter de Phantom, Tailwind, etc.)
```

### 12.3 Configuración de la CLI de Solana (localnet)

```bash
solana config set --url localhost   # Apuntar al validador local
solana-keygen new                   # Crear wallet de desarrollo (si no existe)
solana config get                   # Verificar configuración
```

### 12.4 Estructura del proyecto

```
solana-subasta/
└── subastas/
    ├── programs/
    │   └── subastas/
    │       └── src/
    │           └── lib.rs          # Programa principal (instrucciones,
    │                               # estructuras, contextos, errores)
    ├── tests/
    │   └── subastas.ts             # Tests del programa
    ├── target/
    │   └── idl/
    │       └── subastas.json       # IDL generado al compilar
    ├── Anchor.toml                 # Configuración de Anchor
    ├── Cargo.toml                  # Configuración de Rust
    └── package.json                # Dependencias de Node
└── web/                            # Frontend Next.js (cliente del programa)
```

---

## 13. Compilación, IDL y despliegue

### 13.1 Compilar

```bash
anchor build      # Compila el código Rust a bytecode de Solana
```

### 13.2 Actualizar el Program ID

Tras la primera compilación se obtiene el Program ID. Hay que **actualizarlo en dos lugares**:

1. En `lib.rs` (macro `declare_id!`).
2. En `Anchor.toml`.

Después, **recompilar** para que el binario quede coherente con el nuevo id.

### 13.3 IDL

Cada compilación genera el IDL en `target/idl/subastas.json`. Este fichero describe la interfaz del programa y debe **copiarse al frontend** para que el cliente de Anchor pueda construir las llamadas.

### 13.4 Desplegar (localnet)

```bash
anchor deploy     # Sube el programa compilado a la blockchain local
```

---

## 14. Estrategia de pruebas

### 14.1 Pruebas automatizadas del programa

Los tests (en `tests/subastas.ts`) verifican el comportamiento de las instrucciones. Ejemplos del enfoque:

- **Crear subasta**: comprueba que la transacción se ejecuta sin errores y la cuenta se crea correctamente.
- **Iniciar subasta**: cambia el estado de `0` a `1`.
- **Iniciar de nuevo (debe fallar)**: comprueba que no se puede iniciar una subasta ya iniciada (se espera un error).

Patrón de un test que espera error:

```typescript
it("iniciar subasta, debe fallar", async () => {
    let tx = null;
    try {
        tx = await program.methods.iniciarSubasta(random)/* ... */;
    } catch (error) {
        assert.ok(error);   // Se espera un error
    }
});
```

### 14.2 Flujo de ejecución de pruebas

```bash
# 1) Validador local en una terminal separada (dejar corriendo en segundo plano)
solana-test-validator

# 2) Conseguir SOL de prueba (gas) para ejecutar transacciones
solana airdrop 2
solana balance            # Verificar saldo

# 3) Compilar y actualizar el Program ID (ver sección 13)
anchor build

# 4) Copiar el IDL actualizado al frontend

# 5) Ejecutar los tests sin levantar otro validador (ya está corriendo)
anchor test --skip-local-validator
```

### 14.3 Pruebas manuales (end-to-end)

1. Configurar la wallet Phantom (apuntando al endpoint local).
2. Iniciar el frontend.
3. Crear una subasta desde la interfaz.
4. Iniciar la subasta (botón del front).
5. **Cambiar de cuenta** (logout / login con otra wallet) y realizar una puja por el importe mínimo o superior.
6. Verificar el detalle: ganador actual, listado de pujas, estado de la subasta.
7. Verificar las transacciones/logs en **Solana Explorer**.

> Para probar el cambio de ganador conviene usar al menos dos cuentas distintas, cada una con saldo suficiente para pagar las transacciones.

---

## 15. Despliegue en Devnet (opcional)

Para desarrollo y demostración, **localnet es suficiente**. Si se desea desplegar en Devnet:

1. Crear una **cuenta nueva** en Devnet.
2. Configurar la CLI/proveedor para apuntar a Devnet (en vez de localhost).
3. Solicitar **airdrop** (en Devnet hay un límite diario de solicitudes).
4. **Desplegar** el programa en Devnet.
5. Actualizar el **frontend** para que use el endpoint de Devnet.

---

## 16. Errores comunes y resolución

### Programa / smart contract

| Error | Causa probable | Solución |
|-------|----------------|----------|
| `Account not found` | El validador local no está corriendo o el programa no se ha desplegado. | Arrancar `solana-test-validator` y desplegar (`anchor deploy`). |
| `Insufficient funds` | La cuenta no tiene SOL para pagar la transacción/rent. | `solana airdrop 2`. |
| `Account already in use` | Se intenta crear una subasta con un `id` ya usado. | Cambiar el `id` de la subasta. |
| Program ID incoherente | No se actualizó el Program ID en `lib.rs` y `Anchor.toml`. | Actualizar en ambos sitios y recompilar. |

### Frontend

| Error | Causa probable | Solución |
|-------|----------------|----------|
| Errores de Webpack | Configuración del bundler / dependencias. | Revisar configuración y versiones; muchos de estos errores dependen del entorno concreto de desarrollo. |
| El frontend no encuentra el programa | IDL desactualizado o Program ID distinto. | Recompilar, copiar el IDL nuevo al frontend y verificar el Program ID. |
| Tests que fallan de forma intermitente | Problemas de *timing* entre operaciones. | Añadir pequeños retardos entre pasos complejos. |

---

## 17. Roadmap y ejercicios propuestos

### Nivel básico

1. Cambiar la duración de la subasta (p. ej. a 5 minutos) en los tests y comprobar que siguen pasando.
2. Añadir un campo `categoria: String` a `Subasta`, propagarlo en `crear_subasta` y en los tests.
3. Crear un error `PujaDemasiadoBaja` que se lance cuando la puja sea menor que `importe_minimo`.

### Nivel intermedio

4. **Validación del creador**: que solo el creador pueda iniciar la subasta.
   `require!(subasta.creador == *ctx.accounts.user.key, SubastasError::SoloCreadorPuedeIniciar);`
5. **Reembolso**: al haber una nueva puja ganadora, devolver fondos al ganador anterior (transferencia de SOL entre cuentas).
6. **Listar pujas**: función que devuelva todas las pujas de una subasta concreta usando `getProgramAccounts` con filtros.

### Nivel avanzado

7. **Depósito real**: que las pujas bloqueen SOL real; al finalizar, transferir al creador.
8. **Finalización automática** tras `fecha_fin` (investigar el *Clock Sysvar*).
9. **Interfaz web ampliada** y robusta con `@solana/web3.js` y el wallet adapter de React.

### Mejoras de producto (futuro)

- NFTs como premio de subasta.
- Subastas holandesas (precio decreciente).
- Marketplace de subastas.
- Integración con oráculos para precios en USD.
- Función "comprar ya" (buy now).

---

## 18. Glosario

| Término | Definición |
|---------|------------|
| **Cuenta (Account)** | Unidad de almacenamiento en Solana; guarda datos o código ejecutable. |
| **Programa (Program)** | "Smart contract" de Solana: cuenta con código ejecutable. |
| **Program ID** | Dirección/identificador único de un programa. |
| **PDA** | *Program Derived Address*: dirección determinista derivada de semillas; sin clave privada. |
| **Seeds (semillas)** | Datos de entrada que generan una PDA. |
| **Instrucción** | Función pública invocable de un programa. |
| **Signer** | Cuenta que firma la transacción para autorizarla. |
| **Discriminador** | 8 bytes iniciales que Anchor añade a una cuenta para identificar su tipo. |
| **Rent (alquiler)** | Depósito de SOL para mantener una cuenta; con saldo suficiente queda *rent-exempt*. |
| **Lamports** | Unidad mínima de SOL. |
| **IDL** | *Interface Definition Language*: describe la interfaz del programa (equivalente al ABI). |
| **Localnet / Devnet** | Red local de desarrollo / red pública de pruebas de Solana. |
| **Airdrop** | Entrega de SOL de prueba a una cuenta. |

---

## 19. Referencias

**Documentación oficial**

- Solana Docs — https://docs.solana.com/
- Anchor Book — https://book.anchor-lang.com/
- Ejemplos de Anchor — https://github.com/coral-xyz/anchor/tree/master/tests

**Tutoriales y herramientas**

- Solana Cookbook — https://solanacookbook.com/
- Solana Explorer — https://explorer.solana.com/
- Solana Playground — https://beta.solpg.io/

**Comunidad**

- Solana Discord — https://discord.com/invite/solana
- Solana Stack Exchange — https://solana.stackexchange.com/

---

*Documento elaborado a partir de la guía de estudio del proyecto y de la transcripción de la demostración y documentación del mismo. El proyecto está pensado como ejercicio de aprendizaje: descarga el repositorio de referencia para consultarlo, pero construye tu propia versión apoyándote en un editor con asistencia de IA.*