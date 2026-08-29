# Depósito Emmanuel — Frontend ERP

Interfaz web (SPA) del ERP. Vive dentro del mismo repo que el backend:
`deposito_emmnauel_backend/frontend/`.

## Stack

- **React 19** + **Vite 8** + **TypeScript**
- **Tailwind CSS 3.4** — tokens de diseño en `tailwind.config.js`
- **React Router 7** · **Recharts 3** · **lucide-react**

## Desarrollo (2 terminales)

```bash
# Terminal 1 — backend (desde la raíz del proyecto)
venv\Scripts\activate
uvicorn app.main:app --reload            # http://127.0.0.1:8000

# Terminal 2 — frontend
cd frontend
npm install        # solo la primera vez
npm run dev        # http://localhost:5173
```

Trabajas en **http://localhost:5173**. Vite reenvía cualquier llamada a `/api`
hacia el backend (`vite.config.ts` → proxy a `:8000`), así que la cookie de
sesión funciona sin configurar CORS.

## Producción / demo (1 solo servidor)

```bash
cd frontend
npm run build      # genera frontend/dist/

# desde la raíz
uvicorn app.main:app             # http://127.0.0.1:8000  sirve TODO
```

`app/main.py` monta `frontend/dist` y devuelve `index.html` para cualquier ruta
que no sea `/api/*`, `/static/*`, `/docs` ni `/login`.

## Estado actual

**Conectado al backend real.** Todas las pantallas consumen `/api/*` y hay
login por sesión (cookie). Sin sesión, cualquier ruta redirige a `/login`.

- Usuario de prueba: `admin@depositoemmanuel.com.gt` / `Admin123`
- Auth: `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- Lecturas: `/api/dashboard`, `/api/productos`, `/api/stock`, `/api/ventas`,
  `/api/compras`, `/api/catalogos`, `/api/distribucion`, `/api/resumen`,
  `/api/reportes/{ventas|compras|rutas}`
- Mutaciones: `/api/venta`, `/api/compra`, `/api/productos`,
  `/api/distribucion/{abrir|cargar|confirmar}`

## Estructura

```
frontend/
  src/
    auth.tsx        AuthProvider + useAuth (login / logout / usuario)
    theme.tsx       modo claro/oscuro
    components/     Button, Card, Field, Sidebar, Topbar, State (spinner/error), …
    pages/          Dashboard, Productos, Stock, Compras, Ventas, NuevaVenta,
                    Distribucion, Reportes, Login, Configuracion
    lib/
      api.ts        cliente fetch (credentials, 401 → /login)
      useApi.ts     hook de carga con estado loading/error/reload
      types.ts      formas de las respuestas del backend
      format.ts     moneda (Q) y números
    data/helpers.ts saludo, fecha larga, rangos ISO
    index.css       Tailwind + clases .btn / .card / .field-input …
```

Tokens de diseño (`tailwind.config.js`): fondo salvia `#8f9f8a`, panel `#0f1c15`,
acento lima `#c4ef4a`, `pos`/`neg` para variaciones. Fuentes General Sans +
Inter cargadas por `<link>` en `index.html`.
