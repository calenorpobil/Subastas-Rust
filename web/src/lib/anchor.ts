import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import idl from "@/idl/subastas.json";
import type { Subastas } from "@/idl/subastas";

// Endpoint de la red local de Solana (localnet).
export const ENDPOINT = "http://localhost:8899";

export const PROGRAM_ID = new PublicKey(idl.address);
export const CONNECTION = new Connection(ENDPOINT, "confirmed");

// Construye una instancia tipada del programa a partir de una wallet conectada.
// `AnchorWallet` (la que devuelve `useAnchorWallet()` del wallet-adapter)
// cumple la interfaz `Wallet` que espera `AnchorProvider`.
export function getProgram(wallet: AnchorWallet): anchor.Program<Subastas> {
  const provider = new anchor.AnchorProvider(CONNECTION, wallet, {
    commitment: "confirmed",
  });
  return new anchor.Program(idl as Subastas, provider);
}
