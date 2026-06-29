# Etapa 9 — Despliegue en Devnet (opcional)

## Objetivo
Desplegar el programa en la red pública de pruebas de Solana (Devnet) para que sea accesible desde cualquier lugar sin necesidad de un validador local.

> **Esta etapa es opcional.** Para desarrollo y demostración, localnet es suficiente. Devnet tiene límites de airdrop y dependencias de conectividad.

---

## Pasos

### 9.1 Crear una cuenta nueva para Devnet

Se recomienda usar una cuenta separada de la de desarrollo local para evitar confusiones.

```bash
solana-keygen new --outfile ~/.config/solana/devnet-keypair.json
```

Obtener la dirección pública:
```bash
solana-keygen pubkey ~/.config/solana/devnet-keypair.json
```

---

### 9.2 Configurar la CLI para apuntar a Devnet

```bash
solana config set --url devnet
solana config set --keypair ~/.config/solana/devnet-keypair.json
```

Verificar:
```bash
solana config get
```

La salida debe mostrar:
```
RPC URL: https://api.devnet.solana.com
Keypair Path: ~/.config/solana/devnet-keypair.json
```

---

### 9.3 Solicitar SOL de Devnet (airdrop)

```bash
solana airdrop 2
solana balance
```

> Devnet tiene un límite de airdrop por día. Si el airdrop falla, esperar unas horas o usar el [faucet web de Devnet](https://solfaucet.com/).

---

### 9.4 Actualizar `Anchor.toml` para Devnet

Añadir (o modificar) la sección de Devnet en `Anchor.toml`:

```toml
[programs.devnet]
subastas = "<Program ID>"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/devnet-keypair.json"
```

O alternativamente, cambiar `cluster = "Localnet"` a `cluster = "Devnet"` temporalmente para el despliegue.

---

### 9.5 Compilar para Devnet

```bash
anchor build
```

> Nota: el Program ID es el mismo que se obtuvo en la Etapa 4 (está determinado por el keypair en `target/deploy/`). No cambia entre localnet y Devnet.

---

### 9.6 Desplegar en Devnet

```bash
anchor deploy --provider.cluster devnet
```

O si `Anchor.toml` ya apunta a Devnet:
```bash
anchor deploy
```

El despliegue puede tardar más que en localnet por la latencia de red.

---

### 9.7 Verificar el despliegue en Solana Explorer

1. Abrir [https://explorer.solana.com/](https://explorer.solana.com/).
2. Seleccionar la red **Devnet** (esquina superior derecha).
3. Buscar el Program ID.
4. Debe aparecer como cuenta ejecutable (`Executable: Yes`).

---

### 9.8 Actualizar el frontend para Devnet

Modificar `src/lib/anchor.ts` para apuntar al endpoint de Devnet:

```typescript
// Antes (localnet):
const CONNECTION = new Connection("http://localhost:8899", "confirmed");

// Después (Devnet):
const CONNECTION = new Connection("https://api.devnet.solana.com", "confirmed");
```

---

### 9.9 Configurar Phantom para Devnet

1. En Phantom, abrir Configuración → **Cambiar red**.
2. Seleccionar **Devnet**.
3. La cuenta de Devnet debe tener SOL (del airdrop del paso 9.3).

---

### 9.10 Probar la aplicación en Devnet

Repetir el flujo de la Etapa 8 (pruebas manuales) pero ahora con:
- Frontend apuntando a Devnet.
- Phantom en modo Devnet.
- Verificando las transacciones en [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet).

---

### 9.11 Volver a localnet (después del despliegue)

Para retomar el desarrollo en local:

```bash
solana config set --url localhost
solana config set --keypair ~/.config/solana/id.json
```

Y en `src/lib/anchor.ts` restaurar:
```typescript
const CONNECTION = new Connection("http://localhost:8899", "confirmed");
```

---

## Resumen de diferencias localnet vs Devnet

| Aspecto | Localnet | Devnet |
|---------|----------|--------|
| Disponibilidad | Solo local | Acceso público |
| Velocidad | Inmediata | Depende de la red |
| SOL | Airdrop ilimitado | Límite diario |
| Persistencia | Se reinicia al parar el validador | Persistente |
| Uso recomendado | Desarrollo y tests | Demos públicas y QA |

---

## Criterio de éxito

- [ ] El programa está desplegado en Devnet.
- [ ] El Program ID es visible en Solana Explorer (red Devnet).
- [ ] El frontend apunta al endpoint de Devnet.
- [ ] Phantom está en modo Devnet.
- [ ] Se puede crear y completar una subasta desde la interfaz en Devnet.
