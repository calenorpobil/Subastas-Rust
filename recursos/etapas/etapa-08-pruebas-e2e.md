# Etapa 8 — Pruebas manuales end-to-end

## Objetivo
Verificar que el sistema completo funciona de extremo a extremo: desde el frontend en el navegador hasta el programa en la blockchain local, pasando por la firma con Phantom.

---

## Requisitos previos

- El validador local (`solana-test-validator`) está corriendo.
- El programa está desplegado (`anchor deploy`).
- El frontend está corriendo (`yarn dev`).
- Phantom está configurado apuntando a **Localhost** (`http://localhost:8899`).
- Se dispone de **al menos dos cuentas** en Phantom con SOL de prueba.

---

## Pasos

### 8.1 Preparar las cuentas de prueba

**Cuenta A** (el creador de la subasta):
```bash
solana airdrop 5
solana balance
```

**Cuenta B** (un pujador):
- Generar un segundo keypair:
  ```bash
  solana-keygen new --outfile ~/.config/solana/cuenta-b.json
  solana airdrop 5 $(solana-keygen pubkey ~/.config/solana/cuenta-b.json)
  ```
- Importar esa clave privada en Phantom (Configuración → Añadir cuenta → Importar clave privada).

---

### 8.2 Flujo completo de prueba

#### Paso 1 — Conectar la wallet

1. Abrir `http://localhost:3000`.
2. Hacer clic en **Connect Wallet**.
3. Phantom solicita permiso; aceptar.
4. La dirección de la cuenta debe aparecer en el header.

---

#### Paso 2 — Crear una subasta

1. Rellenar el formulario de creación con datos de prueba:
   - Nombre: `Subasta de prueba`
   - Descripción: `Una subasta de ejemplo`
   - Importe mínimo: `100` (lamports)
   - Fecha de fin: una fecha futura (p. ej. dentro de 1 hora)
2. Hacer clic en **Crear subasta**.
3. Phantom muestra la transacción para firmar; aprobar.
4. La subasta debe aparecer en el listado con **estado 0** (creada).

**Verificar en Solana Explorer:**
- Abrir `http://localhost:8899` en Solana Explorer (seleccionar Custom RPC).
- Buscar la firma de la transacción y confirmar que se ejecutó correctamente.

---

#### Paso 3 — Iniciar la subasta

1. Hacer clic en la subasta recién creada para ver el detalle.
2. Hacer clic en **Iniciar subasta**.
3. Firmar con Phantom (cuenta A, la creadora).
4. El estado debe cambiar a **1** (iniciada).

---

#### Paso 4 — Realizar una puja (cuenta A)

1. En la página de detalle, introducir un importe (p. ej. `200`).
2. Hacer clic en **Pujar**.
3. Firmar con Phantom.
4. La puja debe aparecer en la lista de pujas.
5. El campo **Ganador actual** debe mostrar la dirección de la cuenta A.

---

#### Paso 5 — Cambiar de cuenta y pujar más alto (cuenta B)

1. En Phantom, cambiar a la **Cuenta B**.
2. Recargar la página (o esperar a que se actualice automáticamente).
3. Introducir un importe mayor al de la cuenta A (p. ej. `500`).
4. Hacer clic en **Pujar** y firmar con Phantom (cuenta B).
5. El **ganador actual** debe actualizarse a la dirección de la cuenta B.
6. La puja de cuenta B debe aparecer en el listado.

---

#### Paso 6 — Intentar pujar con un importe menor (debe quedar registrada pero no cambiar el ganador)

1. Volver a la cuenta A en Phantom.
2. Intentar pujar con un importe menor al ganador actual (p. ej. `300`).
3. La transacción se ejecuta (la puja se guarda), pero el ganador **no cambia**.
4. Verificar que `importeGanador` sigue siendo `500`.

---

#### Paso 7 — Finalizar la subasta

1. Hacer clic en **Finalizar subasta**.
2. Firmar con Phantom.
3. El estado debe cambiar a **2** (finalizada).
4. El ganador mostrado es definitivo.

---

### 8.3 Verificar en Solana Explorer

Para cada transacción importante:
1. Ir a `https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`.
2. Buscar la firma de la transacción (Phantom la muestra al aprobar).
3. Confirmar que la instrucción ejecutada es correcta y que no hay errores en los logs.

---

### 8.4 Casos de error a verificar manualmente

| Escenario | Comportamiento esperado |
|-----------|------------------------|
| Pujar en una subasta con estado 0 (no iniciada) | Error del programa: SubastaNoIniciada |
| Pujar en una subasta con estado 2 (finalizada) | Error del programa: SubastaYaFinalizada |
| Iniciar una subasta ya iniciada | Error del programa: SubastaYaIniciada |
| Pujar después de `fecha_fin` | Error del programa: SubastaYaFinalizada |

---

### 8.5 Errores comunes en esta etapa

| Error | Causa | Solución |
|-------|-------|----------|
| Phantom no muestra fondos | La cuenta no tiene SOL en localnet | `solana airdrop 5 <dirección>` |
| "Transaction failed" genérico | El programa rechazó la instrucción | Ver logs en Solana Explorer o en la consola del navegador |
| La lista de subastas no se actualiza | El frontend no refresca tras la transacción | Comprobar que se llama a la función de carga después de cada operación |
| Phantom conectado pero no funciona | Phantom apunta a Mainnet o Devnet | Cambiar a Localhost en la configuración de Phantom |

---

## Criterio de éxito

- [ ] Se puede crear una subasta desde el frontend con firma de Phantom.
- [ ] La subasta aparece en el listado con estado 0.
- [ ] El creador puede iniciarla (estado → 1).
- [ ] Al menos dos cuentas distintas pueden pujar.
- [ ] El ganador cambia correctamente al recibir una puja superior.
- [ ] La subasta se puede finalizar (estado → 2).
- [ ] Las transacciones son visibles y correctas en Solana Explorer.
