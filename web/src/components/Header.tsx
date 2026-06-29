"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

// El botón de wallet depende de APIs del navegador, por lo que se carga solo
// en cliente (sin SSR) para evitar errores de hidratación.
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

// Cabecera principal con navegación y botón de conexión de Phantom.
export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Subastas
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <WalletMultiButton />
      </nav>
    </header>
  );
}
