-- Módulo Contabilidad: tabla de gastos operativos + rol/usuario de Contador.
-- Régimen confirmado con la propietaria: Pequeño Contribuyente (SAT = 5% fijo
-- sobre el total de ventas, sin importar el margen real de cada producto).
-- Seguro de re-ejecutar (usa IF NOT EXISTS / verifica antes de insertar).

CREATE TABLE IF NOT EXISTS gasto (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    categoria       TEXT NOT NULL CHECK (categoria IN
                        ('ALQUILER', 'SUELDOS', 'COMBUSTIBLE', 'LUZ', 'AGUA', 'OTRO')),
    descripcion     TEXT NOT NULL,
    monto           NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    numero_factura  TEXT,
    registrado_por  BIGINT NOT NULL REFERENCES usuario(id),
    creado_en       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gasto_fecha ON gasto (fecha);

-- Rol Contador (ya contemplado en app/permissions.py, faltaba en la base).
INSERT INTO rol (nombre)
VALUES ('Contador')
ON CONFLICT (nombre) DO NOTHING;

-- Usuario de solo consulta para la contadora (Jessica Escobar).
DO $$
DECLARE
    v_rol_id BIGINT;
    v_empleado_id BIGINT;
    v_usuario_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM usuario WHERE username = 'jescobar') THEN
        RETURN; -- ya existe, no duplicar
    END IF;

    SELECT id INTO v_rol_id FROM rol WHERE nombre = 'Contador';

    INSERT INTO empleado (nombre, activo)
    VALUES ('Jessica Escobar', true)
    RETURNING id INTO v_empleado_id;

    INSERT INTO usuario (empleado_id, username, password_hash, email, activo)
    VALUES (
        v_empleado_id,
        'jescobar',
        crypt('Contador123', gen_salt('bf')),
        'contador@depositoemmanuel.com.gt',
        true
    )
    RETURNING id INTO v_usuario_id;

    INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (v_usuario_id, v_rol_id);
END $$;
