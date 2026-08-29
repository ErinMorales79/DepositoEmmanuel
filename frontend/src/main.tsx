import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import { ThemeProvider } from "./theme";
import { AuthProvider } from "./auth";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Stock from "./pages/Stock";
import Compras from "./pages/Compras";
import Ventas from "./pages/Ventas";
import NuevaVenta from "./pages/NuevaVenta";
import Distribucion from "./pages/Distribucion";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import Login from "./pages/Login";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/productos", element: <Productos /> },
      { path: "/stock", element: <Stock /> },
      { path: "/compras", element: <Compras /> },
      { path: "/ventas", element: <Ventas /> },
      { path: "/ventas/nueva", element: <NuevaVenta /> },
      { path: "/distribucion", element: <Distribucion /> },
      { path: "/reportes", element: <Navigate to="/reportes/ventas" replace /> },
      { path: "/reportes/:tipo", element: <Reportes /> },
      { path: "/configuracion", element: <Configuracion /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
