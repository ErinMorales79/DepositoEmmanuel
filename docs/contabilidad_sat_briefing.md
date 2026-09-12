# Módulo CONTABILIDAD — investigación previa (SAT + cálculos)

> Estado: **investigación para llegar a un acuerdo**. Todavía no se construye nada.
> El módulo se llamará **Contabilidad** (no "Facturación").
> Fecha: 2026-09-09.

---

## 0. Antes de todo: hay una contradicción que resolver

En la encuesta la propietaria respondió que está en **Régimen General (12% de IVA, descuenta el IVA de sus compras)**.
Ahora se pide investigar el **Régimen de Pequeño Contribuyente (5%)**.

**Son dos regímenes distintos y excluyentes.** No se puede estar en los dos. Todo el cálculo de
impuestos cambia según cuál sea. Antes de programar hay que confirmar con la contadora (Jessica) o con
la constancia de inscripción / RTU **en cuál está inscrita realmente**.

También dijo que "se declara de una manera distinta a la ley pero sin incumplir ninguna ley". Eso hay
que aterrizarlo con la contadora: **qué número declara exactamente y sobre qué base**. El sistema va a
partir de las ventas y compras reales del negocio y va a mostrar el **cálculo según la ley**; si ella
declara de otra forma, se registra aparte, pero el sistema no debe "esconder" ventas reales porque es
el sistema de inventario y caja del negocio.

---

## 1. Régimen de Pequeño Contribuyente (RPC) — cómo funciona

Base legal: Ley del IVA (Decreto 27-92), artículos 45 a 50. Reforma: **Decreto 31-2024**.

| Punto | Detalle 2026 |
|---|---|
| Límite de ingresos | **Q 500,285.00 al año** (125 salarios mínimos no agrícolas, sin bono). Antes eran Q150,000 fijos; ahora sube cada año con el salario mínimo. |
| Impuesto | **5% sobre el total de ventas del mes** (ventas brutas, sin restar nada). |
| Sustituye a | IVA **e** ISR a la vez. |
| ISR | **Exento.** No presenta declaración de ISR anual, trimestral ni mensual. |
| Crédito fiscal | **No tiene.** El IVA que paga en sus compras NO se descuenta — es un costo más. |
| Declaración | Mensual, en **Declaraguate** (formulario de IVA Pequeño Contribuyente, SAT-2046). Se declara **aunque no haya ventas**. |
| Pago | Dentro del mes calendario siguiente al período (en la práctica muchos contadores lo pagan antes del día 10–15). |
| Factura | **FEL obligatorio** desde 2023. Factura individual por ventas mayores a Q50; las menores a Q50 se pueden consolidar una vez al día. |
| La factura del RPC | Lleva la leyenda "no genera derecho a crédito fiscal". El cliente solo la puede usar como gasto deducible. |
| Retención | Si le compra un "agente de retención", le retienen el 5% y le dan constancia. Esa retención **ya es pago definitivo** de ese mes por esa venta. |
| Si supera el límite | Debe cambiarse a Régimen General el mes siguiente. Si no, la SAT lo hace de oficio y puede multar. |

**En una frase:** paga 5% de todo lo que vende, y ya. No suma ni resta IVA de compras. No paga ISR.

---

## 2. Régimen General (por si resulta que es este)

### 2.1 IVA — 12%

```
IVA débito  = ventas del mes SIN IVA        × 12%     (el IVA que cobró)
IVA crédito = compras del mes SIN IVA        × 12%     (el IVA que pagó, solo con factura válida)
IVA a pagar = IVA débito − IVA crédito − retenciones que le hicieron
```

- Si el crédito sale mayor que el débito, ese saldo a favor **se acumula** para el mes siguiente.
- Formulario **SAT-2237**, mensual, dentro del mes siguiente.

### 2.2 ISR — además del IVA

En Régimen General **también se paga ISR**. Hay dos opciones (se elige una al inscribirse):

| Opción | Tasa | Cómo |
|---|---|---|
| **Opcional Simplificado sobre Ingresos** | 5% hasta Q30,000 de ingresos al mes, **7%** sobre lo que pase de Q30,000 | Mensual. Exento de ISO. La más común en negocios pequeños. |
| **Sobre las Utilidades** | **25% sobre la utilidad** (ganancia neta) | Anual + pagos trimestrales. Sujeto a ISO 1% trimestral (acreditable). |

Regla práctica: si el margen neto del negocio es **mayor a ~25.6%**, conviene el Simplificado (5%/7%).
Si el margen es bajo (mucho costo), puede convenir el de Utilidades (25% de poco).

---

## 3. El punto clave que hoy se calcula mal: **el precio ya lleva el impuesto adentro**

En Guatemala el precio al público **ya incluye el impuesto**. Para saber la ganancia real hay que
**sacar el impuesto** de las ventas y de las compras primero.

### Régimen General (12%)
```
precio con IVA = Q 11.20
base (sin IVA) = 11.20 ÷ 1.12       = Q 10.00
IVA contenido  = 11.20 − 10.00      = Q 1.20   →  esto NO es del negocio, es de la SAT
```

### Pequeño Contribuyente (5%)
No se "saca" un 12%. El 5% se calcula sobre **el total facturado** y se trata como un
**impuesto/gasto del período**.

### El error caro (y por qué el sistema aporta valor)
Tomar el **precio completo** como ingreso y el **costo completo** como costo, sin separar el impuesto.
Eso infla la ganancia en papel y desordena lo que se le debe a la SAT. Con cada compra y cada venta
registrada, el sistema separa esto automáticamente. Eso es exactamente lo que hoy se hace a mano.

---

## 4. Respuestas a las 7 preguntas de la propietaria

Período = **un mes** (se puede elegir el rango). Todas salen de datos que el sistema **ya tiene**,
menos los "gastos operativos" (ver sección 5).

**Definiciones base:**
- **Ventas del período** = suma del total de cada venta (incluye ventas de ruta/camión).
- **Compras del período** = suma del total de cada compra de mercadería.
- **Costo de lo vendido (CMV)** = costo de cada producto × cantidad vendida (sale del inventario FIFO).
- **Gastos operativos** = alquiler, sueldos, combustible, luz, agua, etc. → *el sistema todavía no
  los captura.*

---

### 1) ¿Cuánto estoy pagando netamente a la SAT?

- **Si es Pequeño Contribuyente:**
  ```
  Pago a la SAT = Ventas del mes × 5%   (menos retenciones que ya le hicieron)
  ```
- **Si es Régimen General:**
  ```
  IVA a pagar = (Ventas sin IVA × 12%) − (Compras con factura sin IVA × 12%) − retenciones
  ISR a pagar = 5% / 7% sobre ingresos    (o 25% sobre la utilidad, según su opción)
  Pago total a la SAT = IVA a pagar + ISR a pagar
  ```
  "Netamente" = ya restando el crédito fiscal y las retenciones.

---

### 2) ¿Cuál es mi ganancia bruta?

```
Ganancia bruta = Ventas netas (sin IVA) − Costo de lo vendido (sin IVA)
```
Es lo que deja el **producto en sí**, antes de los gastos del negocio.

---

### 3) ¿Cuál es mi ganancia neta?  → sí, son **dos niveles**

```
Utilidad operativa = Ganancia bruta − Gastos operativos       (antes de impuestos)
Utilidad neta      = Utilidad operativa − Impuestos (ISR / el 5% del RPC)   (después de impuestos)
```
La sensación de "son 2 cálculos" es correcta: **antes de impuestos** y **después de impuestos**.

---

### 4) ¿Cuál es el total vendido?

El sistema puede mostrar las dos vistas:
```
Total vendido (con impuesto)  = suma de todas las ventas          → lo que entró a caja
Total vendido (sin impuesto)  = ese total ÷ 1.12  (Régimen General)  → la base para la SAT
```
En Pequeño Contribuyente el "total vendido" para la SAT **es el total tal cual** (sobre eso va el 5%).

---

### 5) ¿Cuánto invertí este mes?

```
Inversión del mes = suma de las compras de mercadería del mes
```
**Ojo con la diferencia:** "lo que invertí" **no** es lo mismo que "el costo de lo que vendí".
Puede comprar Q10,000 de producto y vender solo Q6,000 de ese inventario en el mes; los otros
Q4,000 quedan en bodega. El sistema puede mostrar:
- **Compras del mes** (lo que gastó reponiendo), y
- **Costo de lo vendido** (lo que efectivamente salió como venta).

---

### 6) ¿Cuál es el porcentaje de ganancia por producto?

Hay **dos formas de expresarlo** (hay que decidir cuál mostrar, o mostrar las dos):

```
Margen sobre venta  = (precio sin IVA − costo sin IVA) ÷ precio sin IVA × 100
Margen sobre costo  = (precio sin IVA − costo sin IVA) ÷ costo sin IVA  × 100   (esto es el "markup")
```
Ejemplo: costo Q60, precio Q100 → **sobre venta 40%**, **sobre costo 66.7%**.
Es la **misma ganancia** (Q40), solo cambia contra qué se compara.

---

### 7) ¿Cuál es mi porcentaje de ganancia general?

```
Margen bruto general = Ganancia bruta total ÷ Ventas netas totales × 100
Margen neto general  = Utilidad neta        ÷ Ventas netas totales × 100
```

---

## 5. Qué falta para que el sistema calcule todo esto

| | Estado |
|---|---|
| Ventas, compras, costo por producto, inventario FIFO | ✅ ya está en el sistema |
| Ventas de ruta/camión como venta real | ✅ ya está (canal CAMION) |
| **Gastos operativos** (alquiler, sueldos, combustible, servicios) | ❌ **falta** — sin esto solo se llega a *ganancia bruta*, no a *ganancia neta* |
| Régimen tributario real de la propietaria | ❓ confirmar (encuesta dice General, se pidió investigar RPC) |
| Opción de ISR (si es Régimen General) | ❓ confirmar con la contadora |
| Si el "costo" guardado en cada producto es **con o sin** IVA | ❓ confirmar (cambia todos los márgenes) |
| El "método distinto" con que declara hoy | ❓ la contadora debe decir el número exacto y la base |

---

## 6. Propuesta de alcance para el acuerdo

1. **Confirmar el régimen** (RPC 5% o General 12% + ISR).
2. Agregar al sistema una **captura simple de gastos** (fecha, categoría, monto, nota) para poder
   llegar a la ganancia neta real.
3. El módulo **Contabilidad** mostraría, por rango de fechas:
   - Total vendido (con y sin impuesto)
   - Compras / inversión del período
   - Costo de lo vendido
   - Ganancia bruta y margen bruto %
   - Gastos operativos
   - Utilidad operativa y utilidad neta
   - Impuesto a pagar a la SAT (según el régimen)
   - Margen de ganancia por producto (tabla)
   - **Libro de ventas** del período (el reporte que pide la contadora)
4. Acceso: solo **Admin** y **Contador** (usuario propio de solo lectura para Jessica).
5. La emisión de FEL / integración con certificadora **queda fuera por ahora** (ella ya factura con
   otro sistema; solo quiere control interno).

---

## 7. Fuentes consultadas

- Ley del IVA (Decreto 27-92): https://tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf
- Régimen Pequeño Contribuyente 2026 (Vesco Consultores): https://vescco.tax/blog/regimen-pequeno-contribuyente-actualizado-2026/
- Límite Pequeño Contribuyente 2026 (MiTrabajoGT): https://www.mitrabajogt.com/blog/pequeno-contribuyente-2026-limite-facturacion-sat-guatemala/
- Guía Régimen Pequeño Contribuyente (HR Talent): https://www.hr-talent.net/regimen-pequeno-contribuyente-guatemala/
- ISR Pequeño Contribuyente (declaracionsat.tax): https://declaracionsat.tax/impuestos/pequeno-contribuyente/
- Crédito fiscal del IVA (HR Talent): https://www.hr-talent.net/credito-fiscal-iva-guatemala/
- Declaración de IVA SAT-2237 / SAT-2046 (ivacalculator.com): https://ivacalculator.com/guatemala/declaracion-iva-sat-2237-2046/
- ISR régimen general: utilidades vs opcional simplificado (FacturaSimple): https://facturasimple.com/gt/blog/gt-regimen-opcional-simplificado-vs-sobre-utilidades
- ISR trimestral 5-7% (Living in Guatemala): https://livinginguatemala.com/tramites/sat-declaracion-isr-trimestral/
- Márgenes bruto/neto (Sage): https://www.sage.com/es-es/blog/diferencia-entre-margen-de-ganancia-bruta-neta-y-de-contribucion/
