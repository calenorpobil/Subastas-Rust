import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Subastas } from "../target/types/subastas";
import { assert } from "chai";

describe("subastas", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Subastas as Program<Subastas>;

  // id único para que cada ejecución use una subasta distinta y no choque
  // con cuentas creadas en ejecuciones previas del mismo ledger.
  const id = new anchor.BN(Math.floor(Math.random() * 1_000_000));

  // IMPORTANTE: el programa valida las fechas contra Clock::unix_timestamp,
  // que está en SEGUNDOS (no en milisegundos). Por eso trabajamos en segundos.
  //
  // Además hay un conflicto temporal intencionado entre instrucciones:
  //   - crear_puja exige   now <  fecha_fin  (la subasta sigue abierta)
  //   - finalizar exige     now >= fecha_fin  (la subasta ya venció)
  // Por eso usamos una ventana corta: pujamos dentro de ella y, antes de
  // finalizar, esperamos a que el reloj de la cadena supere fecha_fin.
  const VENTANA_SEGUNDOS = 15;
  const ahora = Math.floor(Date.now() / 1000);
  const fechaInicio = new anchor.BN(ahora);
  const fechaFin = new anchor.BN(ahora + VENTANA_SEGUNDOS);

  const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("subasta"), id.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [pujaPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("puja"),
      id.toArrayLike(Buffer, "le", 8),
      provider.wallet.publicKey.toBuffer(),
    ],
    program.programId
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("crear subasta", async () => {
    await program.methods
      .crearSubasta(
        id,
        "Subasta de prueba",
        "Descripción de la subasta",
        new anchor.BN(100), // importe mínimo
        fechaInicio,
        fechaFin
      )
      .accountsPartial({ subasta: subastaPda })
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.nombre, "Subasta de prueba");
    assert.equal(subasta.importeMinimo.toNumber(), 100);
    // estado es u8 -> number en TS (no es un BN)
    assert.equal(subasta.estado, 0);
    assert.ok(subasta.creador.equals(provider.wallet.publicKey));
  });

  it("iniciar subasta", async () => {
    await program.methods
      .iniciarSubasta(id)
      .accountsPartial({ subasta: subastaPda })
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.estado, 1);
  });

  it("iniciar subasta de nuevo, debe fallar", async () => {
    let tx: string | null = null;
    try {
      tx = await program.methods
        .iniciarSubasta(id)
        .accountsPartial({ subasta: subastaPda })
        .rpc();
    } catch (error) {
      // Se espera SubastaYaIniciada (estado ya es 1)
      assert.ok(error, "se esperaba un error");
    }
    assert.isNull(tx, "La transacción debería haber fallado");
  });

  it("crear puja", async () => {
    await program.methods
      .crearPuja(id, new anchor.BN(200)) // (id, importe_puja) -> el ts lo pone la cadena
      .accountsPartial({ puja: pujaPda, subasta: subastaPda })
      .rpc();

    const puja = await program.account.puja.fetch(pujaPda);
    assert.equal(puja.importePuja.toNumber(), 200);

    // La subasta debe haber registrado al nuevo ganador
    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.importeGanador.toNumber(), 200);
    assert.ok(subasta.ganador.equals(provider.wallet.publicKey));
  });

  it("finalizar subasta", async () => {
    // Esperar a que el reloj de la cadena supere fecha_fin antes de finalizar.
    const objetivoMs = (fechaFin.toNumber() + 1) * 1000;
    const esperaMs = objetivoMs - Date.now();
    if (esperaMs > 0) {
      await sleep(esperaMs + 1000);
    }

    await program.methods
      .finalizarSubasta(id)
      .accountsPartial({ subasta: subastaPda })
      .rpc();

    const subasta = await program.account.subasta.fetch(subastaPda);
    assert.equal(subasta.estado, 2);
  });
});
