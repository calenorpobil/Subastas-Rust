"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useGlobalContext } from "@/context/GlobalContext";
import {
  crearPuja,
  estadoLabel,
  finalizarSubasta,
  getPujas,
  getSubasta,
  iniciarSubasta,
} from "@/lib/subastas";

type Subasta = NonNullable<Awaited<ReturnType<typeof getSubasta>>>;
type PujaItem = Awaited<ReturnType<typeof getPujas>>[number];

const SIN_GANADOR = PublicKey.default.toString();

// Traduce errores conocidos del programa/runtime a mensajes claros para el
// usuario. La PDA de la puja se deriva de (subasta, cuenta), por lo que cada
// cuenta solo puede pujar una vez: un segundo intento hace fallar el `init` con
// el error "already in use" del System Program.
function mensajeError(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/already in use/i.test(msg)) {
    return "Ya has pujado en esta subasta con esta cuenta. Cada cuenta solo puede realizar una puja por subasta.";
  }
  return e instanceof Error ? e.message : fallback;
}

export default function SubastaDetallePage() {
  const { wallet } = useGlobalContext();
  const params = useParams<{ id: string }>();
  const idStr = params.id;
  const idBN = new anchor.BN(idStr);

  const [subasta, setSubasta] = useState<Subasta | null>(null);
  const [pujas, setPujas] = useState<PujaItem[]>([]);
  const [importePuja, setImportePuja] = useState("");
  const [cargando, setCargando] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!wallet) return;
    setCargando(true);
    setError(null);
    try {
      const data = await getSubasta(wallet, idBN);
      setSubasta(data);
      if (data) setPujas(await getPujas(wallet, idBN));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar la subasta");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, idStr]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // `yaAplicado` permite comprobar el estado real on-chain cuando la acción
  // lanza error: `.rpc()` puede recibir un error de reenvío/preflight
  // ("already in use") aunque la transacción ya se haya confirmado, así que si
  // el efecto ya está aplicado no lo tratamos como fallo.
  const ejecutar = async (
    accion: () => Promise<string>,
    yaAplicado?: () => Promise<boolean>
  ) => {
    setAccionando(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      if (!(yaAplicado && (await yaAplicado().catch(() => false)))) {
        setError(mensajeError(e, "La operación falló"));
      }
    } finally {
      await cargar();
      setAccionando(false);
    }
  };

  if (!wallet) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-zinc-500">Conecta tu wallet para ver la subasta.</p>
      </div>
    );
  }

  if (cargando && !subasta) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-zinc-500">Cargando…</p>
      </div>
    );
  }

  if (!subasta) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12 space-y-2">
        <p className="text-zinc-500">No se encontró la subasta #{idStr}.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  const esCreador = subasta.creador.toString() === wallet.publicKey.toString();
  const ganador = subasta.ganador.toString();
  // Cada cuenta solo puede pujar una vez por subasta (la PDA de la puja se
  // deriva de la subasta y la cuenta), así que evitamos solicitar la
  // transacción si esta wallet ya tiene una puja registrada.
  const yaHaPujado = pujas.some(
    (p) => p.account.pk.toString() === wallet.publicKey.toString()
  );
  // El programa solo permite finalizar una vez alcanzada la fecha de cierre
  // (`now >= fecha_fin`); antes de eso la transacción siempre revierte.
  const vencida = Date.now() >= subasta.fechaFin.toNumber() * 1000;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {subasta.nombre}
        </h1>
        <p className="text-zinc-600">{subasta.descripcion}</p>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-zinc-500">Estado</dt>
        <dd>{estadoLabel(subasta.estado)}</dd>
        <dt className="text-zinc-500">Importe mínimo</dt>
        <dd>{subasta.importeMinimo.toString()} lamports</dd>
        <dt className="text-zinc-500">Cierre</dt>
        <dd>
          {new Date(subasta.fechaFin.toNumber() * 1000).toLocaleString()}
        </dd>
        <dt className="text-zinc-500">Puja ganadora</dt>
        <dd>
          {ganador === SIN_GANADOR
            ? "Sin pujas"
            : `${subasta.importeGanador.toString()} lamports (${ganador.slice(
                0,
                8
              )}…)`}
        </dd>
      </dl>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Acciones según el estado */}
      {subasta.estado === 0 && esCreador && (
        <button
          disabled={accionando}
          onClick={() => ejecutar(() => iniciarSubasta(wallet, idBN))}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Iniciar subasta
        </button>
      )}

      {subasta.estado === 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {yaHaPujado && (
            <p className="w-full text-sm text-amber-700">
              Ya has pujado en esta subasta con esta cuenta. Cada cuenta solo
              puede realizar una puja por subasta.
            </p>
          )}
          <input
            type="number"
            min="1"
            placeholder="Importe (lamports)"
            value={importePuja}
            onChange={(e) => setImportePuja(e.target.value)}
            disabled={yaHaPujado}
            className="rounded border border-black/15 p-2 disabled:opacity-50"
          />
          <button
            disabled={accionando || !importePuja || yaHaPujado}
            onClick={() =>
              ejecutar(
                () => crearPuja(wallet, idBN, new anchor.BN(importePuja)),
                async () =>
                  (await getPujas(wallet, idBN)).some(
                    (p) =>
                      p.account.pk.toString() === wallet.publicKey.toString()
                  )
              )
            }
            className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Pujar
          </button>
          {esCreador && (
            <>
              <button
                disabled={accionando || !vencida}
                onClick={() =>
                  ejecutar(
                    () => finalizarSubasta(wallet, idBN),
                    async () =>
                      (await getSubasta(wallet, idBN))?.estado === 2
                  )
                }
                className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Finalizar subasta
              </button>
              {!vencida && (
                <p className="w-full text-sm text-zinc-500">
                  Podrás finalizar la subasta cuando llegue su fecha de cierre.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Pujas ({pujas.length})</h2>
        {pujas.length === 0 && (
          <p className="text-zinc-500">Todavía no hay pujas.</p>
        )}
        <ul className="space-y-2">
          {pujas
            .slice()
            .sort((a, b) =>
              b.account.importePuja.cmp(a.account.importePuja)
            )
            .map((p) => (
              <li
                key={p.publicKey.toString()}
                className="flex items-center justify-between rounded border border-black/10 p-3 text-sm"
              >
                <span className="font-mono">
                  {p.account.pk.toString().slice(0, 8)}…
                </span>
                <span>{p.account.importePuja.toString()} lamports</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
