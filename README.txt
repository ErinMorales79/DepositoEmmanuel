
Sistema de Gestión para Depósito Emmanuel


DESCRIPCIÓN GENERAL
Este proyecto corresponde a un sistema web de gestión para Depósito Emmanuel,
desarrollado con FastAPI y PostgreSQL. El sistema incluye frontend integrado
mediante plantillas HTML, por lo que no requiere un servidor frontend separado.

Módulos principales implementados:
- Dashboard
- Productos
- Stock
- Compras
- Ventas
- Distribución / Rutas
- Inicio de sesión con autenticación básica

========================================================
FASE 1 - REQUISITOS PREVIOS
========================================================

Antes de ejecutar el proyecto, la computadora debe tener instalado lo siguiente:

1. Python 3.13
2. PostgreSQL 18
3. Visual Studio Code (opcional, recomendado)
4. pgAdmin 4 (opcional, recomendado para restaurar la base de datos)

========================================================
FASE 2 - RESTAURACIÓN DE LA BASE DE DATOS
========================================================

El sistema depende de una base de datos PostgreSQL previamente restaurada.
Dentro de la entrega se incluye una carpeta con los respaldos necesarios.
(mas abajo los comandos)

----------------------------------------
2.1 Usuario de PostgreSQL
----------------------------------------
Usuario sugerido:
postgres

La contraseña de PostgreSQL depende de la instalación local del equipo donde
se ejecute el proyecto. No se incluye una contraseña de PostgreSQL en la entrega.

Contraseña sugerida: 1234

----------------------------------------
2.2 Restauración desde archivo .backup (recomendada)
----------------------------------------

Paso 1: Crear la base de datos
"C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres DepositoEmmanuel

Paso 2: Restaurar el respaldo .backup
"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -U postgres -d DepositoEmmanuel -v "RUTA_COMPLETA_DEL_ARCHIVO.backup"

----------------------------------------
2.3 Restauración desde archivo .sql
----------------------------------------

Paso 1: Crear la base de datos
"C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres DepositoEmmanuel

Paso 2: Restaurar el respaldo .sql
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d DepositoEmmanuel -f "RUTA_COMPLETA_DEL_ARCHIVO.sql"

----------------------------------------
2.4 Verificación de la restauración
----------------------------------------
Después de restaurar la base de datos, se recomienda verificar en pgAdmin
que la base exista correctamente y contenga tablas y datos.

Consultas sugeridas:
SELECT COUNT(*) FROM producto;
SELECT COUNT(*) FROM compra;
SELECT COUNT(*) FROM venta;
SELECT COUNT(*) FROM inventario_lote;

========================================================
FASE 3 - PREPARAR EL ENTORNO DEL PROYECTO
========================================================

----------------------------------------
3.1 Abrir la carpeta correcta
----------------------------------------
Abrir en Visual Studio Code la carpeta raíz del proyecto, por ejemplo:

DepositoEmmanuel_backend

*Ubicado en esta carpeta haz RUN, si no funciona todo correctamente continua con los siguientes pasos*

----------------------------------------
3.2 Crear el entorno virtual (si no existe)
----------------------------------------
Comando:
python -m venv venv

----------------------------------------
3.3 Activar el entorno virtual
----------------------------------------

En PowerShell:
venv\Scripts\Activate.ps1

En CMD:
venv\Scripts\activate

----------------------------------------
3.4 Instalar dependencias
----------------------------------------
Si el proyecto incluye requirements.txt, ejecutar:

pip install -r requirements.txt

En caso de que sea necesario instalar dependencias manualmente, usar:

pip install fastapi uvicorn sqlalchemy jinja2 python-multipart itsdangerous psycopg[binary]

NOTA:
*Si requirements.txt está presente, es preferible usar solamente:
pip install -r requirements.txt*

========================================================
FASE 4 - EJECUCIÓN DEL SERVIDOR
========================================================

El frontend está integrado dentro del backend, por lo tanto no se necesita
levantar un servidor frontend aparte.

----------------------------------------
4.1 Ejecutar desde terminal
----------------------------------------
Ubicarse en la carpeta raíz del proyecto y ejecutar:

uvicorn app.main:app --reload

----------------------------------------
4.2 Ejecutar desde Visual Studio Code
----------------------------------------
***El proyecto incluye la configuración launch.json dentro de la carpeta .vscode,
también se puede ejecutar desde Visual Studio Code con:

- F5
o
- Run and Debug

Esto levantará el servidor automáticamente.***

----------------------------------------
4.3 Dirección del servidor
----------------------------------------
El sistema corre localmente en:

http://127.0.0.1:8000

========================================================
FASE 5 - ACCESO AL SISTEMA
========================================================

----------------------------------------
5.1 Pantalla inicial
----------------------------------------
Al abrir la raíz del sistema:

http://127.0.0.1:8000

el sistema redirige automáticamente al login.

----------------------------------------
5.2 Usuario de prueba para ingresar
----------------------------------------

Usuario:
admin@depositoemmanuel.com.gt

Contraseña:
Admin123

========================================================
FASE 6 - RUTAS PRINCIPALES DEL SISTEMA
========================================================

Una vez iniciada la sesión, las rutas principales son:

Dashboard:
http://127.0.0.1:8000/dashboard

Productos:
http://127.0.0.1:8000/productos-admin

Compras:
http://127.0.0.1:8000/compras-admin

Stock:
http://127.0.0.1:8000/stock-admin

Distribución:
http://127.0.0.1:8000/distribucion-admin

========================================================
FASE 7 - OBSERVACIONES IMPORTANTES
========================================================

1. El sistema no funcionará correctamente si la base de datos no ha sido
   restaurada previamente.

2. El frontend forma parte del backend, por lo que no se debe levantar un
   proyecto frontend por separado.

3. La contraseña de PostgreSQL depende del equipo local del usuario que ejecuta
   el sistema.

4. El usuario y contraseña del sistema incluidos en este README corresponden
   al acceso interno del proyecto, no al motor PostgreSQL.

5. Si la ejecución falla, verificar:
   - que PostgreSQL esté encendido
   - que la base DepositoEmmanuel exista
   - que el entorno virtual esté activo
   - que las dependencias estén instaladas
   - que el proyecto se ejecute desde la carpeta raíz correcta

========================================================
FASE 8 - RESUMEN RÁPIDO DE EJECUCIÓN
========================================================

1. Restaurar la base de datos
2. Activar el entorno virtual
3. Instalar dependencias
4. Ejecutar:
   uvicorn app.main:app --reload
5. Abrir en navegador:
   http://127.0.0.1:8000
6. Iniciar sesión con:
   admin@depositoemmanuel.com.gt
   Admin123
7. Ejecutar el archivo "backup_postgres_dayli" que se encuentra en la carpeta "Respaldos"

========================================================
FIN DEL README
========================================================