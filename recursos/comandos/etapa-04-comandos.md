# Etapa 4 — Comandos ejecutados

Todos los comandos se ejecutan dentro de **WSL** con shell de login, desde el
directorio del proyecto Anchor (`Subastas/subastas/`).

---

## Verificar el toolchain

```bash
anchor --version
solana --version
```

---

## Primera compilación

Genera el binario y, como efecto secundario, el keypair de despliegue en
`target/deploy/subastas-keypair.json`.

```bash
anchor build
```

---

## Obtener el Program ID

La clave pública del keypair de despliegue es el Program ID definitivo.

```bash
solana address -k target/deploy/subastas-keypair.json
```

En este proyecto el Program ID ya coincidía en `lib.rs` y `Anchor.toml`:

```
7XqZiWcbGwrjeJXSKcspGrbb6SqVteKNx2Re7RyTQYyW
```

---

## Sincronizar el Program ID

Comprobar que el mismo ID aparece en ambos sitios:

- `programs/subastas/src/lib.rs` → `declare_id!("7XqZ...QYyW")`
- `Anchor.toml` → `[programs.localnet] subastas = "7XqZ...QYyW"`

Si no coinciden, actualizar ambos y recompilar.

---

## Segunda compilación (con el ID correcto)

Embebe el Program ID correcto dentro del binario.

```bash
anchor build
```

---

## Verificar el IDL generado

```bash
# address e instrucciones
grep -m1 "\"address\"" target/idl/subastas.json

# resumen del IDL: address, instrucciones, accounts y tipos
python3 -c "import json; d=json.load(open('target/idl/subastas.json')); \
print('address:', d['address']); \
print('instructions:', [i['name'] for i in d['instructions']]); \
print('accounts:', [a['name'] for a in d.get('accounts', [])]); \
print('types:', [t['name'] for t in d.get('types', [])])"
```

---

## Resultado esperado

```
address: 7XqZiWcbGwrjeJXSKcspGrbb6SqVteKNx2Re7RyTQYyW
instructions: ['crear_puja', 'crear_subasta', 'finalizar_subasta', 'iniciar_subasta']
accounts: ['Puja', 'Subasta']
types: ['Puja', 'Subasta']
```
