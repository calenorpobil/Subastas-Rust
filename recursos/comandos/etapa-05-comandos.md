# Etapa 5 — Comandos ejecutados

Pruebas automatizadas del programa. Desde el directorio del proyecto Anchor
(`Subastas/subastas/`).

> **Particularidad del entorno de esta máquina:** el toolchain de Solana
> (`anchor`, `solana`) solo está instalado en **WSL**, pero el binario **`node`
> solo está disponible en Windows** (en WSL no hay `node` en el PATH). Por eso:
> - El validador, el airdrop y el deploy se ejecutan en **WSL**.
> - Los tests TypeScript (ts-mocha) se ejecutan con el **node de Windows**.
> - El keypair financiado de WSL se copia al home de Windows para que el node de
>   Windows pueda firmar con la misma cuenta (mismos fondos).

---

## Preparar el harness de tests (una sola vez)

Ficheros creados: `package.json`, `tsconfig.json`, `tests/subastas.ts`, y en
`Anchor.toml` se cambió `[scripts] test` a `ts-mocha`.

Instalar dependencias (en WSL; npm funciona vía interop):

```bash
# WSL
npm install
```

---

## 5.1 Arrancar el validador local

Dejar corriendo en segundo plano durante toda la etapa. Importante lanzarlo con
una sesión WSL que se mantenga viva (no con `nohup ... &` en un `wsl -lc`
puntual, porque WSL cierra la sesión y mata el proceso).

```bash
# WSL
rm -rf test-ledger
solana-test-validator --reset
```

---

## 5.2 Conseguir SOL de prueba

```bash
# WSL
solana config set --url localhost
solana airdrop 100
solana balance
```

---

## 5.3 Desplegar el programa en el validador local

```bash
# WSL
anchor deploy
```

Salida esperada:

```
Program ID: 7XqZiWcbGwrjeJXSKcspGrbb6SqVteKNx2Re7RyTQYyW
Deploy success
```

---

## 5.4 Hacer accesible el keypair al node de Windows

El node de Windows no lee `/home/carlos/.config/solana/id.json`. Se copia el
mismo keypair (misma pubkey, mismos fondos) al home de Windows:

```bash
# WSL
mkdir -p /mnt/c/Users/Carlos/.config/solana
cp /home/carlos/.config/solana/id.json /mnt/c/Users/Carlos/.config/solana/id.json
```

---

## 5.5 Ejecutar los tests

Con el validador ya corriendo y el programa desplegado. Se ejecuta con el node
de Windows (Git Bash), apuntando al validador en `localhost:8899` y al keypair
copiado:

```bash
# Git Bash (node de Windows)
cd subastas
export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"
export ANCHOR_WALLET="$HOME/.config/solana/id.json"
node_modules/.bin/ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"
```

> Nota: `anchor test --skip-local-validator` no funciona directo en esta máquina
> porque lanza el node de Windows sin exportar `ANCHOR_PROVIDER_URL` /
> `ANCHOR_WALLET`. El comando de arriba es el equivalente que sí funciona.

---

## Resultado esperado

```
  subastas
    ✔ crear subasta
    ✔ iniciar subasta
    ✔ iniciar subasta de nuevo, debe fallar
    ✔ crear puja
    ✔ finalizar subasta

  5 passing (16s)
```

> El test `finalizar subasta` tarda ~15 s a propósito: espera a que el reloj de
> la cadena supere `fecha_fin` (el programa exige `now >= fecha_fin` para
> finalizar, mientras que `crear_puja` exige `now < fecha_fin`).
