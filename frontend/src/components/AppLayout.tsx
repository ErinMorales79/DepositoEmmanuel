import { Loader2, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { moduloDeRuta } from "../permissions";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { usuario, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-app text-ink-3">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  const modulo = moduloDeRuta(loc.pathname);
  const permitido = usuario.modulos.includes(modulo);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-0">
      <Topbar onMenu={() => setOpen(true)} />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[248px_1fr]">
        <aside className="hidden overflow-y-auto border-r border-line lg:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {permitido ? (
            <Outlet />
          ) : (
            <div className="card flex flex-col items-center gap-3 p-12 text-center">
              <ShieldAlert size={28} className="text-neg" />
              <div>
                <h2 className="text-[15px] font-semibold">Sin acceso a este módulo</h2>
                <p className="mt-1 text-sm text-ink-2">
                  Tu rol ({usuario.rol}) no tiene permiso para ver esta sección.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="animate-fade-up absolute left-0 top-0 h-full w-[268px] border-r border-line bg-surface-0">
            <div className="flex justify-end p-3">
              <button
                className="btn-icon"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
