"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

// Estado global de la aplicación. Mantiene la wallet conectada (en el formato
// que espera Anchor) accesible en toda la app. Lo sincroniza `Providers`
// mediante `setWallet` cuando cambia la conexión del wallet-adapter.
interface GlobalState {
  wallet: AnchorWallet | null;
  setWallet: (wallet: AnchorWallet | null) => void;
}

const GlobalContext = createContext<GlobalState | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<AnchorWallet | null>(null);

  return (
    <GlobalContext.Provider value={{ wallet, setWallet }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext(): GlobalState {
  const ctx = useContext(GlobalContext);
  if (!ctx) {
    throw new Error("useGlobalContext debe usarse dentro de <GlobalProvider>");
  }
  return ctx;
}
