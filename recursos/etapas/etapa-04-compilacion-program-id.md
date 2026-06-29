# Etapa 4 — Compilación y obtención del Program ID

## Objetivo
Compilar el programa, obtener el Program ID definitivo y sincronizarlo en todos los lugares donde se referencia, para luego recompilar con el ID correcto.

---

## Pasos

### 4.1 Primera compilación

```bash
anchor build
```

Esta primera compilación genera el binario del programa y, como efecto secundario, produce un keypair nuevo en `target/deploy/subastas-keypair.json`. La clave pública de ese keypair es el **Program ID real** del programa.

> La compilación puede tardar varios minutos la primera vez (descarga y compila las dependencias de Rust).

---

### 4.2 Obtener el Program ID

```bash
solana address -k target/deploy/subastas-keypair.json
```

La salida es una cadena en Base58, por ejemplo:
```
7Bk3Xz9...AbCdEfGh
```

Copiar ese valor: es el **Program ID definitivo**.

---

### 4.3 Actualizar el Program ID en `lib.rs`

Abrir `programs/subastas/src/lib.rs` y reemplazar el ID de ejemplo por el obtenido:

```rust
// Antes (ID generado por defecto):
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Después (tu Program ID real):
declare_id!("7Bk3Xz9...AbCdEfGh");
```

---

### 4.4 Actualizar el Program ID en `Anchor.toml`

Abrir `Anchor.toml` y sustituir el ID en la sección `[programs.localnet]`:

```toml
[programs.localnet]
subastas = "7Bk3Xz9...AbCdEfGh"
```

---

### 4.5 Segunda compilación (con el ID correcto)

```bash
anchor build
```

Esta segunda compilación embebe el Program ID correcto dentro del binario. Es imprescindible: si se despliega el binario de la primera compilación, el ID dentro del programa y el ID del keypair de despliegue no coincidirán y el programa no funcionará.

---

### 4.6 Verificar el IDL generado

Tras compilar, el IDL se genera en:

```
target/idl/subastas.json
```

Abrir el fichero y comprobar que:
- El campo `address` contiene el Program ID correcto.
- Las instrucciones listadas son las 4 esperadas: `crear_subasta`, `iniciar_subasta`, `crear_puja`, `finalizar_subasta`.
- Los tipos `Subasta` y `Puja` aparecen en la sección `accounts` o `types`.

---

### 4.7 Errores comunes en esta etapa

| Error | Causa | Solución |
|-------|-------|----------|
| `Program ID mismatch` | Se olvidó actualizar en `lib.rs` o en `Anchor.toml` | Actualizar en ambos sitios y recompilar |
| Error de compilación de Rust | Sintaxis incorrecta en `lib.rs` | Leer el mensaje de error y corregir el código |
| `target/deploy/subastas-keypair.json` no existe | La primera compilación falló | Corregir los errores y recompilar |

---

## Criterio de éxito

- [ ] `anchor build` finaliza sin errores la segunda vez.
- [ ] `declare_id!` en `lib.rs` contiene el Program ID real.
- [ ] `Anchor.toml` contiene el mismo Program ID en `[programs.localnet]`.
- [ ] `target/idl/subastas.json` existe y lista las 4 instrucciones correctas.
