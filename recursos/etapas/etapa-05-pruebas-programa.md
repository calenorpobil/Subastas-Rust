# Etapa 5 — Pruebas automatizadas del programa

## Objetivo
Escribir y ejecutar tests automatizados que verifiquen el comportamiento correcto de cada instrucción del programa, incluyendo los casos de error esperados.

---

## Pasos

### 5.1 Arrancar el validador local

En una terminal separada (dejar corriendo en segundo plano durante toda esta etapa):

```bash
solana-test-validator
```

> No cerrar esta terminal. El validador debe estar activo para que los tests puedan ejecutarse.

---

### 5.2 Conseguir SOL de prueba

```bash
solana airdrop 2
solana balance
```

La cuenta local necesita SOL para pagar el rent de las cuentas que los tests crearán.

---

### 5.3 Desplegar el programa en el validador local

```bash
anchor deploy
```

Esto sube el binario compilado al validador local. Cada vez que se modifique `lib.rs` hay que recompilar (`anchor build`) y volver a desplegar.

---

### 5.4 Estructura base del fichero de tests

Abrir `tests/subastas.ts`. La estructura básica con Anchor/Mocha:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Subastas } from "../target/types/subastas";
import { assert } from "chai";

describe("subastas", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Subastas as Program<Subastas>;

    // Valor único para identificar la subasta en los tests
    const random = new anchor.BN(Math.floor(Math.random() * 1000000));

    // Tests aquí...
});
```

---

### 5.5 Test: crear subasta

```typescript
it("crear subasta", async () => {
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), random.toArrayLike(Buffer, "le", 8)],
        program.programId
    );

    await program.methods
        .crearSubasta(
            random,
            "Subasta de prueba",
            "Descripción de la subasta",
            new anchor.BN(100),           // importe mínimo
            new anchor.BN(Date.now()),    // fecha inicio
            new anchor.BN(Date.now() + 3600 * 1000) // fecha fin (+1 hora)
        )
        .accounts({ subasta: subastaPda })
        .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.nombre, "Subasta de prueba");
    assert.equal(subasta.estado.toNumber(), 0);
});
```

---

### 5.6 Test: iniciar subasta

```typescript
it("iniciar subasta", async () => {
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), random.toArrayLike(Buffer, "le", 8)],
        program.programId
    );

    await program.methods
        .iniciarSubasta(random)
        .accounts({ subasta: subastaPda })
        .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.estado.toNumber(), 1);
});
```

---

### 5.7 Test: intentar iniciar de nuevo (debe fallar)

```typescript
it("iniciar subasta de nuevo, debe fallar", async () => {
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), random.toArrayLike(Buffer, "le", 8)],
        program.programId
    );

    let tx = null;
    try {
        tx = await program.methods
            .iniciarSubasta(random)
            .accounts({ subasta: subastaPda })
            .rpc();
    } catch (error) {
        assert.ok(error); // Se espera un error
    }

    // Si no hubo error, el test falla
    assert.isNull(tx, "La transacción debería haber fallado");
});
```

---

### 5.8 Test: crear puja

```typescript
it("crear puja", async () => {
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), random.toArrayLike(Buffer, "le", 8)],
        program.programId
    );

    const [pujaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("puja"),
            random.toArrayLike(Buffer, "le", 8),
            provider.wallet.publicKey.toBuffer()
        ],
        program.programId
    );

    await program.methods
        .crearPuja(
            random,
            new anchor.BN(200),         // importe de la puja
            new anchor.BN(Date.now())   // timestamp actual
        )
        .accounts({ puja: pujaPda, subasta: subastaPda })
        .rpc();

    const puja = await program.account.puja.fetch(pujaPda);
    assert.equal(puja.importePuja.toNumber(), 200);

    // Verificar que la subasta actualizó al ganador
    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.importeGanador.toNumber(), 200);
});
```

---

### 5.9 Test: finalizar subasta

```typescript
it("finalizar subasta", async () => {
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), random.toArrayLike(Buffer, "le", 8)],
        program.programId
    );

    await program.methods
        .finalizarSubasta(random)
        .accounts({ subasta: subastaPda })
        .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.estado.toNumber(), 2);
});
```

---

### 5.10 Ejecutar los tests

```bash
# Con el validador ya corriendo (ver paso 5.1):
anchor test --skip-local-validator
```

La salida debe mostrar los tests en verde:
```
subastas
  ✓ crear subasta
  ✓ iniciar subasta
  ✓ iniciar subasta de nuevo, debe fallar
  ✓ crear puja
  ✓ finalizar subasta

5 passing (Xs)
```

---

### 5.11 Errores comunes en esta etapa

| Error | Causa | Solución |
|-------|-------|----------|
| `Account not found` | El programa no está desplegado | Ejecutar `anchor deploy` |
| Tests intermitentes | Problemas de timing | Añadir pequeños retardos entre pasos |
| `Insufficient funds` | Sin SOL para el rent | `solana airdrop 2` |
| Tipos TypeScript incorrectos | IDL desactualizado | Recompilar y actualizar el IDL |

---

## Criterio de éxito

- [ ] El validador local está corriendo.
- [ ] El programa está desplegado (`anchor deploy`).
- [ ] Todos los tests pasan (verde) con `anchor test --skip-local-validator`.
- [ ] El test de "iniciar de nuevo" falla como se espera (error capturado).
