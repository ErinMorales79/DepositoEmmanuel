========================================================
 SISTEMA DE GESTION - DEPOSITO EMMANUEL
========================================================

Sistema web para administrar el deposito: inventario,
compras, ventas, clientes y reportes.

  Backend       : Python + FastAPI     (carpeta app/)
  Frontend      : React + Vite         (carpeta frontend/)
  Base de datos : PostgreSQL 18

Todo vive en un solo proyecto. El backend expone la API
(/api/...) y ademas sirve la aplicacion React.


========================================================
 REQUISITOS (instalar una sola vez)
========================================================

  1. Python 3.13
  2. Node.js 20 o superior
  3. PostgreSQL 18


========================================================
 PASO 1 - RESTAURAR LA BASE DE DATOS
========================================================

Usuario de PostgreSQL: postgres
Contrasena sugerida  : 1234

Crear la base y cargar el respaldo (incluido en la
carpeta "Respaldos"):

  "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres DepositoEmmanuel

  "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d DepositoEmmanuel -f "RUTA_COMPLETA_DEL_RESPALDO.sql"

Si la base ya existe y quieres empezar de cero, primero:

  "C:\Program Files\PostgreSQL\18\bin\dropdb.exe" -U postgres --force DepositoEmmanuel

Para verificar (opcional):

  SELECT COUNT(*) FROM producto;
  SELECT COUNT(*) FROM venta;


========================================================
 PASO 2 - PREPARAR EL PROYECTO (una sola vez)
========================================================

Abrir CMD en la carpeta raiz del proyecto.

  Backend:
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt

  Frontend:
    cd frontend
    npm install
    cd ..

Si tu contrasena de PostgreSQL NO es 1234:
  - Copia el archivo  .env.example  a  .env
  - Cambia el valor de DB_PASSWORD por la tuya


========================================================
 PASO 3 - EJECUTAR EL SISTEMA
========================================================

Antes de nada: PostgreSQL debe estar encendido.
Hay dos maneras de correrlo.


----- FORMA A: solo usar el sistema (1 ventana) --------

  cd frontend
  npm run build
  cd ..
  venv\Scripts\activate
  uvicorn app.main:app

  Abrir en el navegador:  http://127.0.0.1:8000

  (Repetir "npm run build" solo si cambias el frontend.)


----- FORMA B: desarrollar (2 ventanas, recarga auto) --

  Ventana 1 - backend:
    venv\Scripts\activate
    uvicorn app.main:app --reload

  Ventana 2 - frontend:
    cd frontend
    npm run dev

  Abrir en el navegador:  http://localhost:5173


========================================================
 EJECUTAR DESDE VISUAL STUDIO CODE
========================================================

  - Ctrl+Shift+P  ->  "Run Task"  ->
    "ERP: dev (backend + frontend)"
    Levanta backend y frontend juntos.
    Abrir:  http://localhost:5173

  - Tecla F5: levanta SOLO el backend con depurador.


========================================================
 ACCESO AL SISTEMA
========================================================

  Usuario   : admin@depositoemmanuel.com.gt
  Contrasena: Admin123

  (Este usuario es del sistema, NO de PostgreSQL.)


========================================================
 ESTRUCTURA DEL PROYECTO
========================================================

  app/                Backend (FastAPI)
  app/routers/        Endpoints de la API (/api/...)
  app/models/         Tablas mapeadas (SQLAlchemy)
  frontend/           Aplicacion React
  frontend/src/       Codigo de la interfaz
  docs/               Documentacion (modelo ER)
  venv/               Entorno de Python
  requirements.txt    Dependencias del backend

  Herramientas utiles (con el sistema corriendo):
    http://127.0.0.1:8000/test-db   -> prueba la conexion a la BD
    http://127.0.0.1:8000/docs      -> documentacion de la API


========================================================
 SI ALGO FALLA
========================================================

  * No inicia sesion / pantallas vacias:
    Falta levantar el BACKEND. El frontend solo no funciona.

  * "puerto en uso" al arrancar:
      taskkill /F /IM python.exe
      taskkill /F /IM node.exe
    y vuelve a arrancar.

  * La base no responde:
    Revisar que PostgreSQL este encendido y que exista la
    base "DepositoEmmanuel". Probar http://127.0.0.1:8000/test-db

  * En FORMA A no se ven los cambios del frontend:
    Falta correr  npm run build  otra vez.

  * "node" o "npm" no se reconoce:
    Cerrar y abrir una terminal nueva despues de instalar Node.

========================================================
 FIN DEL README
========================================================
