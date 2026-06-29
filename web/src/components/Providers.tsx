"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider,
  useAnchorWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { GlobalProvider, useGlobalContext } from "@/context/GlobalContext";
import { ENDPOINT } from "@/lib/anchor";
import "@solana/wallet-adapter-react-ui/styles.css";

// Sincroniza la wallet del wallet-adapter con el contexto global.
function WalletSync({ children }: { children: ReactNode }) {
  const anchorWallet = useAnchorWallet();
  const { setWallet } = useGlobalContext();

  useEffect(() => {
    setWallet(anchorWallet ?? null);
  }, [anchorWallet, setWallet]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <GlobalProvider>
            <WalletSync>{children}</WalletSync>
          </GlobalProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
