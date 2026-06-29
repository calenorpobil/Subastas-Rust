"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as anchor from "@coral-xyz/anchor";
import { useGlobalContext } from "@/context/GlobalContext";
import { crearSubasta, estadoLabel, getSubastas } from "@/lib/subastas";

type SubastaItem = Awaited<ReturnType<typeof getSubastas>>[number];

export default function Home() {
  const { wallet } = useGlobalContext();
  const [subastas, setSubastas] = useState<SubastaItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos del formulario de creación.
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [importeMinimo, setImporteMinimo] = useState("");
  const [dias, setDias] = useState("7");
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    if (!wallet) return;
    setCargando(true);
    setError(null);
    try {
      const data = await getSubastas(wallet);
      setSubastas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar subastas");
    } finally {
      setCargando(false);
    }
  }, [wallet]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setCreando(true);
    setError(null);
    try {
      const ahora = Math.floor(Date.now() / 1000);
      const fechaInicio = new anchor.BN(ahora);
      const fechaFin = new anchor.BN(ahora + Number(dias) * 86_400);
      // Id aleatorio que cabe en u64 (suficiente para evitar colisiones aquí).
      const id = new anchor.BN(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      await crearSubasta(
        wallet,
        id,
        nombre,
        descripcion,
        new anchor.BN(importeMinimo),
        fechaInicio,
        fechaFin
      );
      setNombre("");
      setDescripcion("");
      setImporteMinimo("");
      setDias("7");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la subasta");
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Subastas</h1>
        {!wallet && (
          <p className="mt-4 text-zinc-500">
            Conecta tu wallet para ver y crear subastas.
          </p>
        )}
      </section>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {wallet && (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Crear subasta</h2>
            <form onSubmit={onCrear} className="grid gap-3">
              <input
                className="rounded border border-black/15 p-2"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                maxLength={32}
              />
              <input
                className="rounded border border-black/15 p-2"
                placeholder="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                maxLength={64}
              />
              <input
                type="number"
                min="1"
                className="rounded border border-black/15 p-2"
                placeholder="Importe mínimo (lamports)"
                value={importeMinimo}
                onChange={(e) => setImporteMinimo(e.target.value)}
                required
              />
              <input
                type="number"
                min="1"
                className="rounded border border-black/15 p-2"
                placeholder="Días hasta el cierre"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={creando}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                {creando ? "Creando…" : "Crear subasta"}
              </button>
            </form>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Subastas activas</h2>
              <button
                onClick={cargar}
                className="text-sm text-blue-600 hover:underline"
              >
                Recargar
              </button>
            </div>

            {cargando && <p className="text-zinc-500">Cargando…</p>}
            {!cargando && subastas.length === 0 && (
              <p className="text-zinc-500">No hay subastas disponibles.</p>
            )}

            <ul className="space-y-3">
              {subastas.map((s) => (
                <li
                  key={s.publicKey.toString()}
                  className="rounded border border-black/10 p-4 hover:bg-black/[0.02]"
                >
                  <Link
                    href={`/subasta/${s.account.id.toString()}`}
                    className="flex items-center justify-between"
                  >
                    <strong>{s.account.nombre}</strong>
                    <span className="text-sm text-zinc-500">
                      {estadoLabel(s.account.estado)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
