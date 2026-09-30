-- Agrega una marca y un proveedor nuevos (para usarlos luego al crear un producto).
-- Edita los valores de abajo y corre el script. Es seguro correrlo varias veces:
-- si el nombre ya existe, no lo duplica.

-- 1) cambia estos valores por los reales antes de correrlo
\set marca_nombre 'Nombre de la marca'
\set proveedor_nombre 'Nombre del proveedor'
\set proveedor_telefono ''
\set proveedor_direccion ''

-- 2) inserta la marca (si no existe)
INSERT INTO marca (nombre)
VALUES (:'marca_nombre')
ON CONFLICT (nombre) DO NOTHING;

-- 3) inserta el proveedor (si no existe)
INSERT INTO proveedor (nombre, telefono, direccion)
VALUES (
    :'proveedor_nombre',
    NULLIF(:'proveedor_telefono', ''),
    NULLIF(:'proveedor_direccion', '')
)
ON CONFLICT (nombre) DO NOTHING;

-- 4) muestra como quedaron, para confirmar
SELECT id, nombre FROM marca WHERE nombre = :'marca_nombre';
SELECT id, nombre, telefono, direccion FROM proveedor WHERE nombre = :'proveedor_nombre';
