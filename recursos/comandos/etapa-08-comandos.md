# Etapa 8 — Comandos ejecutados

Verificación end-to-end del sistema. El guion describe una prueba **manual** en
el navegador con Phantom y dos cuentas. Como complemento (y porque un flujo
manual con Phantom no es reproducible ni automatizable), se ha añadido una
**verificación automatizada multicuenta** que replica exactamente el mismo
recorrido con keypairs contra el validador local.

> **Toolchain:** `solana`/`anchor` viven en **WSL** en esta máquina (ver
> `recursos/comandos/etapa-05-comandos.md`). El frontend usa Node de Windows.
> Versiones: Solana CLI / validator 3.1.10, Anchor 0.32.1, Node 24.18 (nvm, WSL).

---

## 8.1 Arrancar el validador local y desplegar

> **IMPORTANTE (WSL): no pongas el ledger en `/mnt/c`.** Hay que arrancar el
> validador con `--ledger` apuntando a una ruta **nativa de Linux** (p. ej.
> `~/test-ledger`), no dentro del proyecto (que vive en `/mnt/c/...`). Ver el
> apartado 8.6 para el motivo. El código sí puede quedarse en `/mnt/c`:
> `anchor deploy` y los tests se conectan por RPC, da igual dónde esté el ledger.

```bash
# WSL: arrancar el validador con el ledger en el ext4 de WSL, no en /mnt/c.
pkill -f solana-test-validator; sleep 1      # matar cualquier validador colgado
rm -rf ~/test-ledger
solana-test-validator --reset --ledger ~/test-ledger    # dejar corriendo

# en otra terminal (también WSL), desde subastas/
solana config set --url http://localhost:8899
solana airdrop 5
anchor deploy
```

Antes de desplegar/probar, conviene esperar activamente a que el RPC responda:

```bash
for i in $(seq 1 40); do
  solana cluster-version -u http://localhost:8899 >/dev/null 2>&1 && { echo up; break; }
  sleep 1
done
```

Resultado del deploy:

```
Program ID: 7XqZiWcbGwrjeJXSKcspGrbb6SqVteKNx2Re7RyTQYyW
Deploy success
```

---

## 8.2 Verificación automatizada multicuenta

Se creó `subastas/tests/e2e-multicuenta.ts`, que cubre el flujo completo del
guion con **tres** cuentas (A = creadora/pujadora, B = pujadora ganadora,
C = pujadora para los casos de error) y todos los casos de error de la sección
8.4.

```bash
# WSL, desde subastas/ (con el validador en marcha y el programa desplegado)
export ANCHOR_PROVIDER_URL=http://localhost:8899
export ANCHOR_WALLET=$HOME/.config/solana/id.json
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/e2e-multicuenta.ts
```

> Se ejecuta solo este fichero (no `anchor test`) para no arrastrar el test de
> la etapa 5. Las cuentas B y C se financian con `requestAirdrop` dentro del
> propio test.

Salida obtenida:

```
subastas e2e (multicuenta)
  ✔ paso 2 — crea la subasta (estado 0)
  ✔ paso 3 — la creadora inicia la subasta (estado 1)
  ✔ error — iniciar de nuevo falla con SubastaYaIniciada
  ✔ paso 4 — la cuenta A puja 200 y pasa a ser ganadora
  ✔ paso 5 — la cuenta B puja 500 y se convierte en ganadora
  ✔ error — puja por debajo del mínimo falla con PujaInsuficiente
  ✔ error — puja menor que la ganadora falla con PujaNoSuperaGanadora (no se registra)
  ✔ error — finalizar antes de fecha_fin falla con SubastaAunNoVencida
  ✔ paso 7 — tras vencer la ventana, la creadora finaliza (estado 2)
  ✔ error — pujar en una subasta finalizada falla con SubastaNoIniciada

  10 passing (32s)
```

El paso "tras vencer la ventana" tarda ~30 s porque la ventana de subasta es de
30 s reales y hay que esperar a que el reloj de la cadena supere `fecha_fin`
antes de poder finalizar (ver desviación 3 más abajo).

---

## 8.3 Prueba manual en el navegador (Phantom)

Pasos manuales del guion, sin cambios en el procedimiento:

1. `yarn dev` en `web/` (Node de Windows) y abrir el frontend.
2. Phantom apuntando a **Localhost** (`http://localhost:8899`).
3. Conectar wallet → crear subasta → iniciar → pujar (cuenta A) → cambiar a
   cuenta B y pujar más alto → finalizar.
4. Importar la cuenta B en Phantom con la clave privada de un segundo keypair:
   ```bash
   # WSL
   solana-keygen new --outfile ~/.config/solana/cuenta-b.json
   solana airdrop 5 $(solana-keygen pubkey ~/.config/solana/cuenta-b.json)
   ```

> **Importante:** el puerto del frontend en esta máquina es **3000** (Next dev
> por defecto). El guion menciona `localhost:3000` en el paso 1 y, por error,
> `http://localhost:8899` como URL del frontend en la sección 8.1 del Explorer:
> `8899` es el **RPC del validador**, no el frontend.

---

## 8.4 Desviaciones del guion respecto al programa real

El guion de la etapa 8 se escribió para un programa ligeramente distinto del
que se implementó (ver también `etapa-07-comandos.md`). Diferencias relevantes,
todas comprobadas por el test automatizado:

1. **Paso 6 — "pujar más bajo: queda registrada pero no cambia el ganador":**
   **no ocurre.** El programa **rechaza** la puja inferior con
   `PujaNoSuperaGanadora` y no guarda nada (la PDA de la puja ni siquiera se
   crea). El ganador y su importe quedan intactos porque la transacción
   revierte por completo.

2. **Una puja por cuenta:** la PDA de puja es `init` y va sembrada por usuario
   (`["puja", id, user]`). Una misma cuenta **no puede volver a pujar**: el
   segundo intento falla en la creación de la cuenta. Por eso, para probar las
   pujas inferiores se usa una **tercera cuenta** nueva (cuenta C), no la A.

3. **Finalizar exige que la subasta haya vencido:** `finalizar_subasta`
   requiere `now >= fecha_fin` (si no, `SubastaAunNoVencida`). Y `crear_puja`
   requiere `now < fecha_fin`. Son condiciones temporales opuestas: **no se
   puede finalizar nada más crear** una subasta con `fecha_fin` a una hora
   vista, como sugiere el guion. Para una prueba real hay que usar una ventana
   corta y esperar a que venza (en el test, 30 s).

4. **Pujar en una subasta finalizada (estado 2):** el guion (tabla 8.4) espera
   `SubastaYaFinalizada`, pero el programa devuelve **`SubastaNoIniciada`**: la
   comprobación `estado == 1` se evalúa antes que la del vencimiento.

5. **`crearPuja` no envía `ts`** (ya documentado en etapa 7): la firma es
   `(id, importe_puja)` y el timestamp lo pone la cadena.

6. **`estado` es un `u8`** (número en TS), no un `BN`.

7. **Importe mínimo > 0:** `crear_subasta` valida `importe_minimo > 0`
   (`ImporteMinimoInvalido`), además de `fecha_inicio < fecha_fin` y
   `fecha_fin > now`.

### Mapa de casos de error verificados

| Escenario | Error del programa |
|-----------|--------------------|
| Iniciar una subasta ya iniciada | `SubastaYaIniciada` |
| Puja por debajo del importe mínimo | `PujaInsuficiente` |
| Puja que no supera a la ganadora | `PujaNoSuperaGanadora` (no se registra) |
| Finalizar antes de `fecha_fin` | `SubastaAunNoVencida` |
| Pujar en una subasta finalizada (estado 2) | `SubastaNoIniciada` |

---

## 8.5 Parar el validador

```bash
# WSL: detener el proceso solana-test-validator y, si se quiere liberar disco,
# borrar el ledger (regenerable con --reset)
pkill -f solana-test-validator
rm -rf ~/test-ledger
```

---

## 8.6 Por qué el ledger debe ir en una ruta Linux y no en `/mnt/c`

Síntoma típico al lanzarlo desde `/mnt/c/.../subastas`:

```
⠒ Unable to connect to validator: Client error: test-ledger/admin.rpc does not exist
```

**Causa:** `/mnt/c` no es un sistema de ficheros Linux real. WSL2 corre en una VM
con su propio disco **ext4** (ahí vive `~`/`$HOME`); los ficheros de Windows se
exponen a través de **drvfs**, que por debajo habla el protocolo de red **9P**.
Ese puente no implementa toda la semántica POSIX, y el validador necesita justo
lo que falta:

- **Sockets Unix (UDS):** `admin.rpc` es un socket Unix dentro del ledger. Sobre
  9P no se puede crear → de ahí el error `admin.rpc does not exist`.
- **`mmap` + bloqueo de ficheros:** el ledger (RocksDB) y la base de cuentas
  (AppendVec) se abren con `mmap` y locks; 9P no los garantiza de forma fiable.
- **`fsync` / rename atómico / hardlinks:** flojos o no atómicos sobre drvfs.

Cuando una de esas operaciones falla durante el `Initializing... Waiting for
fees to stabilize`, el proceso muere antes de quedar operativo y el socket nunca
aparece.

**Solución:** poner el ledger en el ext4 nativo de WSL con
`--ledger ~/test-ledger`. Además de funcionar, es mucho más rápido: el IO contra
`/mnt/c` cruza la frontera VM↔Windows por 9P en cada operación, y el validador
hace IO intensivo.

> Nota: en algunas versiones de WSL el validador *parece* arrancar desde
> `/mnt/c`, pero es frágil (puede corromper el ledger o ir lentísimo). Regla
> práctica: **IO pesado → ruta Linux nativa; código fuente → puede vivir en
> `/mnt/c`**. Por eso aquí se lanza el validador a mano y los tests se ejecutan
> con `ts-mocha` apuntando al RPC, en vez de `anchor test` (que crearía
> `test-ledger` dentro del proyecto, es decir, en `/mnt/c`).

---

## Criterio de éxito

- [x] El validador local corre y el programa está desplegado.
- [x] Se crea una subasta (estado 0), se inicia (estado 1) y se finaliza (estado 2).
- [x] Dos cuentas distintas pujan y el ganador cambia al recibir una puja superior.
- [x] Las pujas inferiores y los casos de error se comportan como define el programa.
- [x] Flujo completo verificado de extremo a extremo (`10 passing`).
