# Etapa 7 — Implementación del frontend

## Objetivo
Construir la interfaz web completa: contexto global de wallet, providers, cliente de Anchor, páginas de listado y detalle de subastas, y el mecanismo de pujas.

---

## Pasos

### 7.1 Crear el contexto global (`GlobalContext`)

El contexto global mantiene la wallet conectada accesible en toda la aplicación.

`src/context/GlobalContext.tsx`:

```typescript
"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";

interface GlobalContextType {
    wallet: WalletContextState | null;
    setWallet: (wallet: WalletContextState | null) => void;
}

const GlobalContext = createContext<GlobalContextType>({
    wallet: null,
    setWallet: () => {},
});

export function GlobalProvider({ children }: { children: ReactNode }) {
    const [wallet, setWallet] = useState<WalletContextState | null>(null);
    return (
        <GlobalContext.Provider value={{ wallet, setWallet }}>
            {children}
        </GlobalContext.Provider>
    );
}

export const useGlobal = () => useContext(GlobalContext);
```

---

### 7.2 Configurar los providers en `layout.tsx`

El layout raíz debe envolver la aplicación con los providers de wallet y el contexto global.

`src/app/layout.tsx`:

```typescript
"use client";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";
import { GlobalProvider } from "@/context/GlobalContext";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = "http://localhost:8899"; // localnet

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    return (
        <html lang="es">
            <body>
                <ConnectionProvider endpoint={endpoint}>
                    <WalletProvider wallets={wallets} autoConnect>
                        <WalletModalProvider>
                            <GlobalProvider>
                                {children}
                            </GlobalProvider>
                        </WalletModalProvider>
                    </WalletProvider>
                </ConnectionProvider>
            </body>
        </html>
    );
}
```

---

### 7.3 Crear el cliente de Anchor

Función auxiliar para obtener una instancia del programa de Anchor.

`src/lib/anchor.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "@/idl/subastas.json";

const PROGRAM_ID = new PublicKey(idl.address);
const CONNECTION = new Connection("http://localhost:8899", "confirmed");

export function getProgram(wallet: anchor.Wallet) {
    const provider = new anchor.AnchorProvider(CONNECTION, wallet, {
        commitment: "confirmed",
    });
    return new anchor.Program(idl as anchor.Idl, provider);
}

export { PROGRAM_ID, CONNECTION };
```

---

### 7.4 Implementar las operaciones del cliente

`src/lib/subastas.ts` — funciones que interactúan con el programa:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { getProgram, PROGRAM_ID } from "./anchor";

// Obtener todas las subastas
export async function getSubastas(wallet: anchor.Wallet) {
    const program = getProgram(wallet);
    return await program.account.subasta.all();
}

// Obtener pujas de una subasta
export async function getPujas(wallet: anchor.Wallet, id: anchor.BN) {
    const program = getProgram(wallet);
    return await program.account.puja.all([
        {
            memcmp: {
                offset: 8,
                bytes: anchor.utils.bytes.bs58.encode(
                    id.toArrayLike(Buffer, "le", 8)
                ),
            },
        },
    ]);
}

// Crear una subasta
export async function crearSubasta(
    wallet: anchor.Wallet,
    id: anchor.BN,
    nombre: string,
    descripcion: string,
    importeMinimo: anchor.BN,
    fechaInicio: anchor.BN,
    fechaFin: anchor.BN
) {
    const program = getProgram(wallet);
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), id.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
    );
    return await program.methods
        .crearSubasta(id, nombre, descripcion, importeMinimo, fechaInicio, fechaFin)
        .accounts({ subasta: subastaPda })
        .rpc();
}

// Iniciar una subasta
export async function iniciarSubasta(wallet: anchor.Wallet, id: anchor.BN) {
    const program = getProgram(wallet);
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), id.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
    );
    return await program.methods
        .iniciarSubasta(id)
        .accounts({ subasta: subastaPda })
        .rpc();
}

// Crear una puja
export async function crearPuja(
    wallet: anchor.Wallet,
    id: anchor.BN,
    importe: anchor.BN
) {
    const program = getProgram(wallet);
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), id.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
    );
    const [pujaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("puja"),
            id.toArrayLike(Buffer, "le", 8),
            wallet.publicKey.toBuffer(),
        ],
        PROGRAM_ID
    );
    return await program.methods
        .crearPuja(id, importe, new anchor.BN(Date.now()))
        .accounts({ puja: pujaPda, subasta: subastaPda })
        .rpc();
}

// Finalizar una subasta
export async function finalizarSubasta(wallet: anchor.Wallet, id: anchor.BN) {
    const program = getProgram(wallet);
    const [subastaPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("subasta"), id.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
    );
    return await program.methods
        .finalizarSubasta(id)
        .accounts({ subasta: subastaPda })
        .rpc();
}
```

---

### 7.5 Crear el Header con el botón de wallet

`src/components/Header.tsx`:

```typescript
"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Header() {
    return (
        <header className="flex items-center justify-between p-4 bg-gray-900 text-white">
            <h1 className="text-xl font-bold">Subastas Solana</h1>
            <WalletMultiButton />
        </header>
    );
}
```

---

### 7.6 Crear la página de inicio (listado de subastas)

`src/app/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getSubastas } from "@/lib/subastas";
import Link from "next/link";

export default function Home() {
    const wallet = useWallet();
    const [subastas, setSubastas] = useState<any[]>([]);

    useEffect(() => {
        if (!wallet.connected || !wallet.publicKey) return;
        getSubastas(wallet as any).then(setSubastas);
    }, [wallet.connected]);

    return (
        <main className="p-8">
            <h2 className="text-2xl mb-4">Subastas activas</h2>
            {subastas.length === 0 && <p>No hay subastas disponibles.</p>}
            <ul className="space-y-4">
                {subastas.map((s) => (
                    <li key={s.publicKey.toString()} className="border p-4 rounded">
                        <Link href={`/subasta/${s.account.id}`}>
                            <strong>{s.account.nombre}</strong> — Estado: {s.account.estado.toString()}
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}
```

---

### 7.7 Crear la página de detalle de subasta

`src/app/subasta/[id]/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useParams } from "next/navigation";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, PROGRAM_ID } from "@/lib/anchor";
import { crearPuja, iniciarSubasta, finalizarSubasta, getPujas } from "@/lib/subastas";

export default function DetalleSubasta() {
    const wallet = useWallet();
    const { id } = useParams();
    const [subasta, setSubasta] = useState<any>(null);
    const [pujas, setPujas] = useState<any[]>([]);
    const [importePuja, setImportePuja] = useState("");

    const idBN = new anchor.BN(id as string);

    const cargar = async () => {
        if (!wallet.connected) return;
        const program = getProgram(wallet as any);
        const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("subasta"), idBN.toArrayLike(Buffer, "le", 8)],
            PROGRAM_ID
        );
        const data = await program.account.subasta.fetch(pda);
        setSubasta(data);
        const pujasData = await getPujas(wallet as any, idBN);
        setPujas(pujasData);
    };

    useEffect(() => { cargar(); }, [wallet.connected]);

    if (!subasta) return <p className="p-8">Cargando...</p>;

    return (
        <main className="p-8 space-y-6">
            <h2 className="text-2xl font-bold">{subasta.nombre}</h2>
            <p>{subasta.descripcion}</p>
            <p>Estado: {subasta.estado.toString()} | Ganador actual: {subasta.ganador.toString()} | Puja ganadora: {subasta.importeGanador.toString()} lamports</p>

            {subasta.estado.toNumber() === 0 && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={() => iniciarSubasta(wallet as any, idBN).then(cargar)}>
                    Iniciar subasta
                </button>
            )}

            {subasta.estado.toNumber() === 1 && (
                <div className="space-y-2">
                    <input type="number" placeholder="Importe (lamports)"
                        value={importePuja} onChange={(e) => setImportePuja(e.target.value)}
                        className="border p-2 rounded" />
                    <button className="bg-green-600 text-white px-4 py-2 rounded"
                        onClick={() => crearPuja(wallet as any, idBN, new anchor.BN(importePuja)).then(cargar)}>
                        Pujar
                    </button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded ml-2"
                        onClick={() => finalizarSubasta(wallet as any, idBN).then(cargar)}>
                        Finalizar subasta
                    </button>
                </div>
            )}

            <h3 className="text-xl font-semibold">Pujas</h3>
            <ul className="space-y-2">
                {pujas.map((p) => (
                    <li key={p.publicKey.toString()} className="border p-2 rounded">
                        {p.account.pk.toString()} — {p.account.importePuja.toString()} lamports
                    </li>
                ))}
            </ul>
        </main>
    );
}
```

---

### 7.8 Formulario para crear subastas

Añadir en `src/app/page.tsx` un formulario que llame a `crearSubasta`:

```typescript
// Añadir un formulario con los campos:
// - nombre (string)
// - descripcion (string)
// - importeMinimo (número en lamports)
// - fechaFin (date picker o número de días)
// Al enviar, generar un id aleatorio y llamar a crearSubasta(...)
```

---

## Criterio de éxito

- [ ] El contexto global `GlobalContext` está creado y funciona.
- [ ] Los providers (wallet + contexto global) envuelven la aplicación en `layout.tsx`.
- [ ] El cliente de Anchor (`lib/anchor.ts`) se conecta a localnet.
- [ ] Las operaciones de `lib/subastas.ts` están implementadas.
- [ ] La página de inicio lista las subastas existentes.
- [ ] La página de detalle muestra la subasta, el ganador y las pujas.
- [ ] Se puede iniciar, pujar y finalizar desde la interfaz.
- [ ] `yarn dev` corre sin errores de compilación.
