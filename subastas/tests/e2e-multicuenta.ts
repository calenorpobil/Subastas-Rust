import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Subastas } from "../target/types/subastas";
import { assert } from "chai";

// ---------------------------------------------------------------------------
// Etapa 8 — Verificación end-to-end automatizada (multicuenta).
//
// El guion de la etapa 8 describe una prueba MANUAL en el navegador con
// Phantom y dos cuentas. Este fichero es el equivalente automatizado del
// mismo flujo: replica con keypairs lo que el guion pide hacer a mano, de
// forma que el camino completo (crear → iniciar → pujar A → pujar B mayor →
// finalizar) y los casos de error queden verificados de extremo a extremo
// contra el validador local.
//
// Diferencias respecto al guion (intencionadas, según el programa real):
//   - El paso 6 del guion ("pujar más bajo: queda registrada pero no cambia
//     el ganador") NO ocurre: el programa RECHAZA la puja con
//     PujaNoSuperaGanadora y no guarda nada.
//   - Cada cuenta solo puede pujar UNA vez (la PDA de puja es `init` y va
//     sembrada por usuario). Por eso las pujas más bajas se prueban con una
//     tercera cuenta nueva.
//   - finalizar_subasta exige `now >= fecha_fin`; con la subasta aún abierta
//     devuelve SubastaAunNoVencida. Por eso usamos una ventana corta y
//     esperamos a que venza antes de finalizar.
//   - Pujar en una subasta finalizada (estado 2) devuelve SubastaNoIniciada
//     (la comprobación `estado == 1` se hace antes), no SubastaYaFinalizada.
// ---------------------------------------------------------------------------

describe("subastas e2e (multicuenta)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Subastas as Program<Subastas>;
  const conn = provider.connection;

  // Cuenta A = wallet del provider (la creadora).
  const cuentaA = provider.wallet;
  // Cuenta B = pujadora que se queda como ganadora.
  const cuentaB = anchor.web3.Keypair.generate();
  // Cuenta C = pujadora nueva para los casos de puja insuficiente / no supera.
  const cuentaC = anchor.web3.Keypair.generate();

  const id = new anchor.BN(Math.floor(Math.random() * 1_000_000));

  // Ventana de subasta en segundos. El reloj de la cadena sigue al reloj real
  // del validador local, así que esperamos esta ventana en tiempo real antes
  // de finalizar. Lo bastante larga para ejecutar todas las pujas antes de que
  // venza, y lo bastante corta para no alargar el test.
  const VENTANA = 30;
  const ahora = Math.floor(Date.now() / 1000);
  const fechaInicio = new anchor.BN(ahora);
  const fechaFin = new anchor.BN(ahora + VENTANA);

  const IMPORTE_MINIMO = 100;

  const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("subasta"), id.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const pujaPdaDe = (user: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("puja"), id.toArrayLike(Buffer, "le", 8), user.toBuffer()],
      program.programId
    )[0];

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Devuelve el código de error de Anchor (p. ej. "PujaNoSuperaGanadora").
  const errCode = (e: any): string =>
    e?.error?.errorCode?.code ?? e?.toString?.() ?? String(e);

  const airdrop = async (pk: anchor.web3.PublicKey) => {
    const sig = await conn.requestAirdrop(
      pk,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    const bh = await conn.getLatestBlockhash();
    await conn.confirmTransaction(
      { signature: sig, ...bh },
      "confirmed"
    );
  };

  before(async () => {
    await airdrop(cuentaB.publicKey);
    await airdrop(cuentaC.publicKey);
  });

  // --- Paso 2: crear la subasta (cuenta A) -------------------------------
  it("paso 2 — crea la subasta (estado 0)", async () => {
    await program.methods
      .crearSubasta(
        id,
        "Subasta de prueba",
        "Una subasta de ejemplo",
        new anchor.BN(IMPORTE_MINIMO),
        fechaInicio,
        fechaFin
      )
      .accountsPartial({ subasta: subastaPda, user: cuentaA.publicKey })
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.nombre, "Subasta de prueba");
    assert.equal(subasta.estado, 0); // estado es u8 -> number
    assert.equal(subasta.importeGanador.toNumber(), 0);
    assert.ok(subasta.creador.equals(cuentaA.publicKey));
  });

  // --- Paso 3: iniciar la subasta (cuenta A) -----------------------------
  it("paso 3 — la creadora inicia la subasta (estado 1)", async () => {
    await program.methods
      .iniciarSubasta(id)
      .accountsPartial({ subasta: subastaPda, user: cuentaA.publicKey })
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.estado, 1);
  });

  it("error — iniciar de nuevo falla con SubastaYaIniciada", async () => {
    try {
      await program.methods
        .iniciarSubasta(id)
        .accountsPartial({ subasta: subastaPda, user: cuentaA.publicKey })
        .rpc();
      assert.fail("debería haber fallado");
    } catch (e) {
      assert.equal(errCode(e), "SubastaYaIniciada");
    }
  });

  // --- Paso 4: puja de la cuenta A ---------------------------------------
  it("paso 4 — la cuenta A puja 200 y pasa a ser ganadora", async () => {
    await program.methods
      .crearPuja(id, new anchor.BN(200))
      .accountsPartial({
        puja: pujaPdaDe(cuentaA.publicKey),
        subasta: subastaPda,
        user: cuentaA.publicKey,
      })
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.importeGanador.toNumber(), 200);
    assert.ok(subasta.ganador.equals(cuentaA.publicKey));
  });

  // --- Paso 5: cuenta B puja más alto y pasa a ser ganadora --------------
  it("paso 5 — la cuenta B puja 500 y se convierte en ganadora", async () => {
    await program.methods
      .crearPuja(id, new anchor.BN(500))
      .accountsPartial({
        puja: pujaPdaDe(cuentaB.publicKey),
        subasta: subastaPda,
        user: cuentaB.publicKey,
      })
      .signers([cuentaB])
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.importeGanador.toNumber(), 500);
    assert.ok(subasta.ganador.equals(cuentaB.publicKey));
  });

  // --- Paso 6 (corregido): pujas más bajas SON RECHAZADAS ----------------
  it("error — puja por debajo del mínimo falla con PujaInsuficiente", async () => {
    try {
      await program.methods
        .crearPuja(id, new anchor.BN(50)) // < importe mínimo (100)
        .accountsPartial({
          puja: pujaPdaDe(cuentaC.publicKey),
          subasta: subastaPda,
          user: cuentaC.publicKey,
        })
        .signers([cuentaC])
        .rpc();
      assert.fail("debería haber fallado");
    } catch (e) {
      assert.equal(errCode(e), "PujaInsuficiente");
    }
  });

  it("error — puja menor que la ganadora falla con PujaNoSuperaGanadora (no se registra)", async () => {
    try {
      await program.methods
        .crearPuja(id, new anchor.BN(300)) // >= mínimo pero < ganadora (500)
        .accountsPartial({
          puja: pujaPdaDe(cuentaC.publicKey),
          subasta: subastaPda,
          user: cuentaC.publicKey,
        })
        .signers([cuentaC])
        .rpc();
      assert.fail("debería haber fallado");
    } catch (e) {
      assert.equal(errCode(e), "PujaNoSuperaGanadora");
    }

    // La puja rechazada no deja rastro: la PDA no existe y el ganador sigue B.
    const pujaC = await program.account.puja.fetchNullable(
      pujaPdaDe(cuentaC.publicKey)
    );
    assert.isNull(pujaC);
    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.importeGanador.toNumber(), 500);
    assert.ok(subasta.ganador.equals(cuentaB.publicKey));
  });

  // --- Paso 7: finalizar -------------------------------------------------
  it("error — finalizar antes de fecha_fin falla con SubastaAunNoVencida", async () => {
    try {
      await program.methods
        .finalizarSubasta(id)
        .accountsPartial({ subasta: subastaPda, user: cuentaA.publicKey })
        .rpc();
      assert.fail("debería haber fallado");
    } catch (e) {
      assert.equal(errCode(e), "SubastaAunNoVencida");
    }
  });

  it("paso 7 — tras vencer la ventana, la creadora finaliza (estado 2)", async () => {
    // Esperar a que el reloj de la cadena supere fecha_fin.
    const objetivoMs = (fechaFin.toNumber() + 1) * 1000;
    const esperaMs = objetivoMs - Date.now();
    if (esperaMs > 0) await sleep(esperaMs + 1000);

    await program.methods
      .finalizarSubasta(id)
      .accountsPartial({ subasta: subastaPda, user: cuentaA.publicKey })
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.estado, 2);
    // El ganador definitivo es la cuenta B con 500.
    assert.equal(subasta.importeGanador.toNumber(), 500);
    assert.ok(subasta.ganador.equals(cuentaB.publicKey));
  });

  it("error — pujar en una subasta finalizada falla con SubastaNoIniciada", async () => {
    try {
      await program.methods
        .crearPuja(id, new anchor.BN(1000))
        .accountsPartial({
          puja: pujaPdaDe(cuentaC.publicKey),
          subasta: subastaPda,
          user: cuentaC.publicKey,
        })
        .signers([cuentaC])
        .rpc();
      assert.fail("debería haber fallado");
    } catch (e) {
      // estado == 1 se comprueba antes que el vencimiento -> SubastaNoIniciada.
      assert.equal(errCode(e), "SubastaNoIniciada");
    }
  });
});
