# Modelo Entidad–Relación — Depósito Emmanuel

Base de datos **PostgreSQL 18**. Esquema `public`. Sistema de gestión para un
depósito de bebidas: catálogo, inventario por lote y ubicación, compras, ventas
de mostrador, distribución en camión y control de accesos.

> Este documento describe el esquema **tal como está** (restaurado y depurado el
> 2026-08-28 desde el respaldo limpio del 24-ago). Los diagramas están agrupados
> por dominio para lectura; al final hay una lista de mejoras sugeridas.

---

## 1. Dominios

| Dominio | Tablas |
|---|---|
| **Catálogo** | `marca`, `proveedor`, `producto` |
| **Inventario** | `ubicacion_inventario`, `lote`, `inventario_lote`, `movimiento_inventario`, `ajuste_inventario`, `detalle_ajuste_inventario` |
| **Compras** | `compra`, `detalle_compra` |
| **Ventas** | `cliente`, `venta`, `detalle_venta`, `pedido` |
| **Distribución** | `camion`, `empleado`, `ruta`, `ruta_detalle`, `cuadre_ruta` |
| **Seguridad y caja** | `usuario`, `rol`, `permiso`, `usuario_rol`, `rol_permiso`, `bitacora`, `cierre_caja` |

Todas las claves primarias son `bigint … GENERATED ALWAYS AS IDENTITY`.
`PK` = clave primaria · `FK` = foránea · `UK` = única.

---

## 2. Catálogo

```mermaid
erDiagram
    marca ||--o{ producto : "clasifica"
    proveedor ||--o{ producto : "surte"

    marca {
        bigint id PK
        text   nombre UK
    }
    proveedor {
        bigint id PK
        text   nombre UK
        text   telefono
        text   direccion
    }
    producto {
        bigint  id PK
        text    codigo_barra UK "regex ^[0-9]{8,14}$"
        text    nombre UK
        bigint  marca_id FK
        bigint  proveedor_id FK
        integer unidades_por_fardo ">0"
        numeric precio_venta ">=0"
        numeric precio_compra ">=0"
        boolean es_retornable "def false"
        boolean requiere_vencimiento "def true"
        integer stock_minimo "def 0, >=0"
        boolean activo "def true"
    }
```

---

## 3. Inventario

El stock **no** vive en `producto`: se calcula sumando `inventario_lote.cantidad`
para el producto en una ubicación. `movimiento_inventario` es la bitácora física
(todo ingreso, salida o traslado deja un renglón).

```mermaid
erDiagram
    producto             ||--o{ lote                      : "se compra en"
    compra               ||--o{ lote                      : "origina"
    lote                 ||--o{ inventario_lote           : "ubicado en"
    ubicacion_inventario ||--o{ inventario_lote           : "contiene"
    producto             ||--o{ movimiento_inventario     : "afecta"
    lote                 ||--o{ movimiento_inventario     : "de"
    usuario              ||--o{ movimiento_inventario     : "registra"
    ubicacion_inventario ||--o{ movimiento_inventario     : "origen/destino"
    usuario              ||--o{ ajuste_inventario          : "solicita"
    ajuste_inventario    ||--o{ detalle_ajuste_inventario : "detalla"
    lote                 ||--o{ detalle_ajuste_inventario : "ajusta"
    ubicacion_inventario ||--o{ detalle_ajuste_inventario : "en"

    ubicacion_inventario {
        bigint id PK
        text   nombre UK "BODEGA, CAMION, MOTO"
    }
    lote {
        bigint    id PK
        bigint    producto_id FK
        bigint    compra_id FK "nullable"
        date      fecha_vencimiento
        timestamp creado_en "def now()"
        numeric   costo_unitario_neto
    }
    inventario_lote {
        bigint  id PK
        bigint  lote_id FK "UK con ubicacion_id"
        bigint  ubicacion_id FK
        integer cantidad ">=0"
    }
    movimiento_inventario {
        bigint          id PK
        movimiento_tipo tipo "INGRESO|SALIDA|TRASLADO|AJUSTE|DEVOLUCION|ANULACION"
        timestamp       fecha_hora "def now()"
        bigint          usuario_id FK
        bigint          producto_id FK
        bigint          lote_id FK "nullable"
        bigint          ubicacion_origen_id FK "nullable"
        bigint          ubicacion_destino_id FK "nullable"
        integer         cantidad ">0"
        text            referencia_tipo
        bigint          referencia_id
        text            motivo
    }
    ajuste_inventario {
        bigint    id PK
        bigint    usuario_id FK
        timestamp fecha_hora "def now()"
        text      motivo
        bigint    autorizado_por FK "nullable"
    }
    detalle_ajuste_inventario {
        bigint  id PK
        bigint  ajuste_id FK
        bigint  lote_id FK
        bigint  ubicacion_id FK
        integer cantidad_delta
        text    observacion
    }
```

---

## 4. Compras

Flujo: se crea `compra` en `BORRADOR` con sus `detalle_compra`, luego la función
`finalizar_compra(compra_id, usuario_id)` genera los `lote`, mete stock en
`inventario_lote` (BODEGA) y registra `movimiento_inventario` de tipo `INGRESO`.

```mermaid
erDiagram
    proveedor ||--o{ compra         : "emite"
    usuario   ||--o{ compra         : "registra"
    compra    ||--o{ detalle_compra : "contiene"
    producto  ||--o{ detalle_compra : "de"

    compra {
        bigint         id PK
        bigint         proveedor_id FK
        bigint         usuario_id FK
        timestamp      fecha_hora "def now()"
        text           numero_factura "nullable"
        numeric        total ">=0"
        compra_estado  estado "def BORRADOR"
        timestamp      finalizada_en
        bigint         finalizada_por FK
    }
    detalle_compra {
        bigint  id PK
        bigint  compra_id FK
        bigint  producto_id FK
        integer cantidad ">0"
        numeric precio_unitario ">=0"
        numeric subtotal_linea ">=0 (trigger)"
        date    fecha_vencimiento "nullable"
    }
```

---

## 5. Ventas

Venta de mostrador: descuenta stock de BODEGA por FIFO (vencimiento, luego id) y
crea `venta` + `detalle_venta`. `pedido` es una entidad prevista para pedidos a
domicilio (hoy sin uso desde la aplicación).

```mermaid
erDiagram
    cliente ||--o{ venta         : "compra"
    usuario ||--o{ venta         : "atiende"
    pedido  ||--o{ venta         : "cumple (nullable)"
    ruta    ||--o{ venta         : "canal camión (nullable)"
    venta   ||--o{ detalle_venta : "contiene"
    producto ||--o{ detalle_venta : "de"
    cliente ||--o{ pedido        : "solicita"
    usuario ||--o{ pedido        : "crea"

    venta {
        bigint       id PK
        bigint       cliente_id FK
        bigint       usuario_id FK
        bigint       pedido_id FK "nullable"
        bigint       ruta_id FK "nullable"
        timestamp    fecha_hora "def now()"
        venta_estado estado "ACTIVA|ANULADA|FINALIZADA"
        venta_canal  canal "MOSTRADOR|MOTO|CAMION"
        numeric      subtotal ">=0"
        numeric      descuento_porcentaje "def 0"
        numeric      descuento_monto "def 0"
        numeric      total ">=0"
        metodo_pago  metodo_pago "def EFECTIVO"
        numeric      monto_efectivo "def 0"
        numeric      monto_tarjeta "def 0"
        text         motivo_anulacion
        bigint       anulada_por FK
        timestamp    anulada_en
    }
    detalle_venta {
        bigint  id PK
        bigint  venta_id FK
        bigint  producto_id FK
        integer cantidad ">0"
        numeric precio_unitario ">=0"
        numeric subtotal_linea ">=0 (trigger)"
    }
    pedido {
        bigint        id PK
        bigint        cliente_id FK
        text          direccion_entrega
        timestamp     fecha_hora "def now()"
        pedido_estado estado "def PENDIENTE"
        bigint        creado_por FK
        timestamp     confirmado_en
    }
    cliente {
        bigint    id PK
        text      nombre
        text      direccion
        text      telefono
        boolean   es_ocasional "def false"
        timestamp creado_en "def now()"
    }
```

---

## 6. Distribución

Abrir ruta → cargar camión (BODEGA→CAMION FIFO) → registrar regreso y vendido →
`cuadre_ruta` compara efectivo recibido contra lo que dice el sistema.

```mermaid
erDiagram
    camion   ||--o{ ruta         : "asignado a"
    empleado ||--o{ ruta         : "conduce"
    usuario  ||--o{ ruta         : "abre"
    ruta     ||--o{ ruta_detalle : "carga"
    producto ||--o{ ruta_detalle : "de"
    ruta     ||--|| cuadre_ruta   : "cierra con"
    usuario  ||--o{ cuadre_ruta   : "cuadra"

    camion {
        bigint id PK
        text   placa UK
        text   descripcion
    }
    empleado {
        bigint  id PK
        text    nombre
        text    telefono
        boolean activo "def true"
    }
    ruta {
        bigint      id PK
        bigint      camion_id FK "1 abierta por camión (índice parcial)"
        bigint      piloto_id FK "-> empleado"
        bigint      creada_por FK "-> usuario"
        date        fecha
        ruta_estado estado "ABIERTA|CERRADA, def ABIERTA"
    }
    ruta_detalle {
        bigint  id PK
        bigint  ruta_id FK
        bigint  producto_id FK
        integer cantidad_salida ">=0"
        integer cantidad_regreso ">=0, def 0"
    }
    cuadre_ruta {
        bigint    id PK
        bigint    ruta_id FK "UK (1:1 con ruta)"
        bigint    cerrado_por FK
        timestamp fecha_hora_cierre "def now()"
        numeric   monto_esperado ">=0"
        numeric   monto_recibido ">=0"
        numeric   diferencia
        text      observacion
    }
```

---

## 7. Seguridad y caja

`usuario` se asocia 1:1 con un `empleado`. Permisos vía roles (`usuario_rol`,
`rol_permiso`). `bitacora` audita cambios de la aplicación; `cierre_caja` cuadra
la caja diaria.

```mermaid
erDiagram
    empleado ||--|| usuario      : "es"
    usuario  ||--o{ usuario_rol  : ""
    rol      ||--o{ usuario_rol  : ""
    rol      ||--o{ rol_permiso  : ""
    permiso  ||--o{ rol_permiso  : ""
    usuario  ||--o{ bitacora     : "genera"
    usuario  ||--o{ cierre_caja  : "cierra"

    usuario {
        bigint  id PK
        bigint  empleado_id FK "UK (1:1 con empleado)"
        text    username UK
        text    password_hash "bcrypt (pgcrypto crypt())"
        boolean activo "def true"
        citext  email UK "dominio @depositoemmanuel(.com).gt"
    }
    rol {
        bigint id PK
        text   nombre UK
    }
    permiso {
        bigint id PK
        text   codigo UK
        text   descripcion
    }
    usuario_rol {
        bigint usuario_id PK "FK -> usuario"
        bigint rol_id PK "FK -> rol"
    }
    rol_permiso {
        bigint rol_id PK "FK -> rol"
        bigint permiso_id PK "FK -> permiso"
    }
    bitacora {
        bigint    id PK
        bigint    usuario_id FK
        timestamp fecha_hora "def now()"
        text      accion
        text      entidad
        bigint    registro_id
        jsonb     antes
        jsonb     despues
        text      detalle
    }
    cierre_caja {
        bigint    id PK
        date      fecha UK
        bigint    cerrado_por FK
        timestamp fecha_hora "def now()"
        numeric   total_sistema ">=0"
        numeric   total_efectivo ">=0"
        numeric   total_tarjeta ">=0"
        numeric   diferencia
        text      observacion
    }
```

---

## 8. Tipos enumerados

| ENUM | Valores |
|---|---|
| `compra_estado` | BORRADOR · FINALIZADA · ANULADA |
| `venta_estado` | ACTIVA · ANULADA · FINALIZADA |
| `venta_canal` | MOSTRADOR · MOTO · CAMION |
| `metodo_pago` | EFECTIVO · TARJETA · MIXTO |
| `movimiento_tipo` | INGRESO · SALIDA · TRASLADO · AJUSTE · DEVOLUCION · ANULACION |
| `ruta_estado` | ABIERTA · CERRADA |
| `pedido_estado` | PENDIENTE · CONFIRMADO · CANCELADO · ENTREGADO |

Extensiones usadas: `citext` (email sin distinción de mayúsculas), `pgcrypto`
(`crypt()` para contraseñas).

---

## 9. Lógica en la base de datos

### Funciones

| Función | Rol |
|---|---|
| `finalizar_compra(compra_id, usuario_id)` | Pasa una compra de BORRADOR a FINALIZADA: crea lotes, stock en BODEGA y movimientos de INGRESO. |
| `fn_cargar_camion_fifo(ruta_id, usuario_id, items jsonb)` | Traslada producto BODEGA→CAMION por FIFO de vencimiento y acumula `ruta_detalle.cantidad_salida`. |
| `fn_cerrar_ruta_sin_ventas(ruta_id, usuario_id, monto_recibido, obs)` | Devuelve lo no vendido CAMION→BODEGA, consume lo vendido y crea `cuadre_ruta`. |

### Triggers

| Trigger | Tabla | Efecto |
|---|---|---|
| `trg_subtotal_detalle_compra` | `detalle_compra` | `subtotal_linea = cantidad * precio_unitario` (BEFORE INS/UPD). |
| `trg_subtotal_detalle_venta` | `detalle_venta` | Igual para ventas. |
| `trg_validar_vencimiento_lote` | `lote` | Exige/prohíbe `fecha_vencimiento` según `producto.requiere_vencimiento`. |
| `trg_bloquear_update_detalle_compra` | `detalle_compra` | Impide modificar/borrar renglones de una compra FINALIZADA. |
| `trg_no_update_cliente_id` | `cliente` | Impide cambiar el `id`. |

### Vistas

| Vista | Contenido |
|---|---|
| `vw_stock_producto_ubicacion` | `(producto_id, ubicacion_id, stock)` — suma de existencias. |
| `vw_stock_por_ubicacion` | Lo anterior con nombres y todas las combinaciones producto×ubicación (solo productos activos). |
| `vw_seguimiento_ruta` | Detalle de ruta con camión, piloto, producto y `vendido_estimado`. |

---

## 10. Mejoras sugeridas (opcionales)

Ninguna es urgente; el esquema funciona. En orden de valor:

1. **`inventario_lote.cantidad` con índice único ya cubierto** — bien. Falta un
   índice en `movimiento_inventario(referencia_tipo, referencia_id)` para
   rastrear rápido "todos los movimientos de la venta X" (hoy sí existe
   `idx_mov_ref`, ✔).
2. **`compra.numero_factura`**: es `nullable` y sin unicidad. Si el negocio no
   permite dos compras con la misma factura del mismo proveedor, añadir
   `UNIQUE (proveedor_id, numero_factura)`.
3. **`cliente.telefono` / `proveedor.telefono`**: sin formato. Un `CHECK` de
   patrón (o dejar libre a propósito) evita datos sucios.
4. **Nombres**: casi todo es consistente (`snake_case`, español). Las únicas
   asimetrías son `cuadre_ruta.fecha_hora_cierre` vs. `compra.fecha_hora` /
   `venta.fecha_hora` — unificar a `fecha_hora` daría uniformidad total.
5. **Tablas previstas y sin uso desde la app**: `pedido`, `ajuste_inventario` +
   `detalle_ajuste_inventario`, `cierre_caja`, `bitacora`. Están bien diseñadas
   y son parte del alcance del negocio (pedidos a domicilio, ajustes de
   inventario, cierre de caja, auditoría). **Recomendación: conservarlas** e
   irlas conectando; no aportan riesgo vacías.
6. **`movimiento_inventario.referencia_tipo`** es texto libre (`'COMPRA'`,
   `'RUTA_CARGA'`, `'VENTA'`, …). Convertirlo en ENUM documentaría los valores
   válidos.
7. **Auditoría automática**: `bitacora` hoy se llenaría desde la aplicación.
   Un trigger genérico `AFTER INSERT/UPDATE/DELETE` sobre las tablas clave la
   poblaría sin depender del backend.

---

*Generado el 2026-08-28 a partir del esquema en `DepositoEmmanuel`.*
