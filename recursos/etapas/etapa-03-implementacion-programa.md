# Etapa 3 — Implementación del programa Solana

## Objetivo
Escribir la lógica completa del smart contract en `lib.rs`: estructuras de datos, instrucciones, contextos de validación de cuentas y errores personalizados.

---

## Pasos

### 3.1 Añadir las dependencias necesarias al inicio de `lib.rs`

```rust
use anchor_lang::prelude::*;
```

Anchor ya lo incluye por defecto. Si se necesita el `Clock` sysvar para timestamps, añadir:
```rust
use anchor_lang::solana_program::clock::Clock;
```

---

### 3.2 Definir las estructuras de datos

Añadir al final del fichero (fuera del módulo `#[program]`) las estructuras de las cuentas.

**Cuenta `Subasta`:**
```rust
#[account]
#[derive(InitSpace)]
pub struct Subasta {
    pub id: u64,
    #[max_len(32)]
    pub nombre: String,
    #[max_len(64)]
    pub descripcion: String,
    pub importe_minimo: u64,
    pub fecha_inicio: u64,
    pub fecha_fin: u64,
    pub estado: u64,            // 0=creada, 1=iniciada, 2=finalizada
    pub creador: Pubkey,
    pub ganador: Pubkey,
    pub importe_ganador: u64,
}
```

**Cuenta `Puja`:**
```rust
#[account]
#[derive(InitSpace)]
pub struct Puja {
    pub id: u64,
    pub importe_puja: u64,
    pub ts: u64,
    pub pk: Pubkey,
}
```

> `#[derive(InitSpace)]` permite que Anchor calcule el espacio necesario automáticamente.
> `#[max_len(n)]` es obligatorio para los campos `String`, para que el cálculo sea posible.

---

### 3.3 Implementar los errores personalizados

```rust
#[error_code]
pub enum SubastasError {
    #[msg("La subasta ya ha sido iniciada")]
    SubastaYaIniciada,
    #[msg("La subasta no ha sido iniciada")]
    SubastaNoIniciada,
    #[msg("La subasta ya ha sido finalizada")]
    SubastaYaFinalizada,
}
```

---

### 3.4 Implementar la instrucción `crear_subasta`

Dentro del módulo `#[program]`:

```rust
pub fn crear_subasta(
    ctx: Context<CrearSubastaContext>,
    id: u64,
    nombre: String,
    descripcion: String,
    importe_minimo: u64,
    fecha_inicio: u64,
    fecha_fin: u64,
) -> Result<()> {
    let subasta = &mut ctx.accounts.subasta;
    subasta.id = id;
    subasta.nombre = nombre;
    subasta.descripcion = descripcion;
    subasta.importe_minimo = importe_minimo;
    subasta.fecha_inicio = fecha_inicio;
    subasta.fecha_fin = fecha_fin;
    subasta.estado = 0;
    subasta.creador = *ctx.accounts.user.key;
    subasta.ganador = *ctx.accounts.user.key;
    subasta.importe_ganador = 0;
    Ok(())
}
```

**Contexto de `crear_subasta`:**
```rust
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CrearSubastaContext<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Subasta::INIT_SPACE,
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

---

### 3.5 Implementar la instrucción `iniciar_subasta`

```rust
pub fn iniciar_subasta(
    ctx: Context<IniciarSubastaContext>,
    _id: u64,
) -> Result<()> {
    let subasta = &mut ctx.accounts.subasta;
    require!(subasta.estado == 0, SubastasError::SubastaYaIniciada);
    subasta.estado = 1;
    Ok(())
}
```

**Contexto de `iniciar_subasta`:**
```rust
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct IniciarSubastaContext<'info> {
    #[account(
        mut,
        seeds = [b"subasta", id.to_le_bytes().as_ref()],
        bump
    )]
    pub subasta: Account<'info, Subasta>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

---

### 3.6 Implementar la instrucción `crear_puja`

```rust
pub fn crear_puja(
    ctx: Context<CrearPujaContext>,
    id: u64,
    importe_puja: u64,
    ts: u64,
) -> Result<()> {
    let puja = &mut ctx.accounts.puja;
    let subasta = &mut ctx.accounts.subasta;

    // Si la puja supera la ganadora actual, actualizar el ganador
    if importe_puja > subasta.importe_ganador {
        subasta.ganador = *ctx.accounts.user.key;
        subasta.importe_ganador = importe_puja;
    }

    // Verificar que la subasta no haya terminado
    require!(ts < subasta.fecha_fin, SubastasError::SubastaYaFinalizada);

    // Guardar los datos de la puja
    puja.id = id;
    puja.importe_puja = importe_puja;
    puja.ts = ts;
    puja.pk = *ctx.accounts.user.key;
    Ok(())
}
```

**Contexto de `crear_puja`:**
```rust
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CrearPujaContext<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Puja::INIT_SPACE,
        seeds = [b"puja", id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub puja: Account<'info, Puja>,

    #[account(
        mut,
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

> La PDA de `puja` combina el `id` de la subasta y la `key` del usuario, lo que garantiza **una sola puja por usuario y subasta**.

---

### 3.7 Implementar la instrucción `finalizar_subasta`

```rust
pub fn finalizar_subasta(
    ctx: Context<FinalizarSubastaContext>,
    _id: u64,
) -> Result<()> {
    let subasta = &mut ctx.accounts.subasta;
    require!(subasta.estado == 1, SubastasError::SubastaNoIniciada);
    subasta.estado = 2;
    Ok(())
}
```

**Contexto de `finalizar_subasta`:**
```rust
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct FinalizarSubastaContext<'info> {
    #[account(
        mut,
        seeds = [b"subasta", id.to_le_bytes().as_ref()],
        bump
    )]
    pub subasta: Account<'info, Subasta>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

---

### 3.8 Resumen de la estructura final de `lib.rs`

El fichero debe seguir este orden:
1. `use anchor_lang::prelude::*;`
2. `declare_id!("...");`
3. Módulo `#[program]` con las 4 instrucciones.
4. Estructuras de contexto (`#[derive(Accounts)]`) para cada instrucción.
5. Estructuras de datos (`#[account]`): `Subasta` y `Puja`.
6. Errores personalizados (`#[error_code]`).

---

## Criterio de éxito

- [ ] `lib.rs` tiene las estructuras `Subasta` y `Puja` con `#[derive(InitSpace)]`.
- [ ] Las 4 instrucciones están implementadas: `crear_subasta`, `iniciar_subasta`, `crear_puja`, `finalizar_subasta`.
- [ ] Cada instrucción tiene su contexto `#[derive(Accounts)]` con seeds correctas.
- [ ] Los errores `SubastasError` están definidos.
- [ ] El fichero compila sin errores (verificar en la siguiente etapa).
