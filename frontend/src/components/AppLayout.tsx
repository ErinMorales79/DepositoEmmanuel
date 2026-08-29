import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
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

  return (
    <div className="min-h-screen bg-app p-3 sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1640px] flex-col overflow-hidden rounded-[26px] border border-line bg-surface-0 sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)]">
        <Topbar onMenu={() => setOpen(true)} />

        <div className="grid flex-1 lg:grid-cols-[248px_1fr]">
          <aside className="hidden border-r border-line lg:block">
            <Sidebar />
          </aside>
          <main className="min-w-0 p-4 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>
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
