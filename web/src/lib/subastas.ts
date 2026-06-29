import * as anchor from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { getProgram, PROGRAM_ID } from "./anchor";

// Estados de una subasta tal como los define el programa (campo `estado`, u8).
export const ESTADOS = ["Creada", "Iniciada", "Finalizada"] as const;

export function estadoLabel(estado: number): string {
  return ESTADOS[estado] ?? "Desconocido";
}

// Deriva la PDA de una subasta a partir de su id.
export function subastaPda(id: anchor.BN): anchor.web3.PublicKey {
  const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("subasta"), id.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
  return pda;
}

// Deriva la PDA de la puja de un usuario sobre una subasta.
export function pujaPda(
  id: anchor.BN,
  user: anchor.web3.PublicKey
): anchor.web3.PublicKey {
  const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("puja"), id.toArrayLike(Buffer, "le", 8), user.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// Obtener todas las subastas.
export async function getSubastas(wallet: AnchorWallet) {
  const program = getProgram(wallet);
  return await program.account.subasta.all();
}

// Obtener una subasta concreta por id (o null si no existe).
export async function getSubasta(wallet: AnchorWallet, id: anchor.BN) {
  const program = getProgram(wallet);
  return await program.account.subasta.fetchNullable(subastaPda(id));
}

// Obtener las pujas de una subasta filtrando por su id (offset 8 = primer campo).
export async function getPujas(wallet: AnchorWallet, id: anchor.BN) {
  const program = getProgram(wallet);
  return await program.account.puja.all([
    {
      memcmp: {
        offset: 8,
        bytes: anchor.utils.bytes.bs58.encode(id.toArrayLike(Buffer, "le", 8)),
      },
    },
  ]);
}

// Crear una subasta. Las fechas se expresan en segundos (unix timestamp).
export async function crearSubasta(
  wallet: AnchorWallet,
  id: anchor.BN,
  nombre: string,
  descripcion: string,
  importeMinimo: anchor.BN,
  fechaInicio: anchor.BN,
  fechaFin: anchor.BN
) {
  const program = getProgram(wallet);
  return await program.methods
    .crearSubasta(id, nombre, descripcion, importeMinimo, fechaInicio, fechaFin)
    .accountsPartial({ subasta: subastaPda(id), user: wallet.publicKey })
    .rpc();
}

// Iniciar una subasta (solo el creador).
export async function iniciarSubasta(wallet: AnchorWallet, id: anchor.BN) {
  const program = getProgram(wallet);
  return await program.methods
    .iniciarSubasta(id)
    .accountsPartial({ subasta: subastaPda(id), user: wallet.publicKey })
    .rpc();
}

// Crear una puja. El programa registra el timestamp on-chain, por eso el
// cliente solo envía el id y el importe.
export async function crearPuja(
  wallet: AnchorWallet,
  id: anchor.BN,
  importe: anchor.BN
) {
  const program = getProgram(wallet);
  return await program.methods
    .crearPuja(id, importe)
    .accountsPartial({
      puja: pujaPda(id, wallet.publicKey),
      subasta: subastaPda(id),
      user: wallet.publicKey,
    })
    .rpc();
}

// Finalizar una subasta (solo el creador, una vez vencida).
export async function finalizarSubasta(wallet: AnchorWallet, id: anchor.BN) {
  const program = getProgram(wallet);
  return await program.methods
    .finalizarSubasta(id)
    .accountsPartial({ subasta: subastaPda(id), user: wallet.publicKey })
    .rpc();
}
