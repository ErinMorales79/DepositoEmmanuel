import { Building2, Palette, ShieldCheck, Users } from "lucide-react";
import Card from "../components/Card";
import { Field, Input } from "../components/Field";
import PageHeader from "../components/PageHeader";

const secciones = [
  { icon: Building2, titulo: "Negocio", desc: "Nombre, NIT, dirección y moneda por defecto." },
  { icon: Users, titulo: "Usuarios y roles", desc: "Cajero, repartidor, piloto y sus permisos." },
  { icon: ShieldCheck, titulo: "Seguridad", desc: "Contraseñas, sesión y respaldo diario de la base." },
  { icon: Palette, titulo: "Apariencia", desc: "Tema lima sobre verde. Densidad de tablas." },
];

export default function Configuracion() {
  return (
    <div>
      <PageHeader title="Configuración" subtitle="Ajustes generales del sistema" />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {secciones.map((s) => (
            <Card key={s.titulo} bodyClass="p-5">
              <div className="grid h-10 w-10 place-items-center rounded-control bg-surface-2 text-brand">
                <s.icon size={18} />
              </div>
              <h3 className="mt-3 text-[15px] font-semibold">{s.titulo}</h3>
              <p className="mt-1 text-[13px] text-ink-2">{s.desc}</p>
            </Card>
          ))}
        </div>

        <Card title="Datos del negocio" bodyClass="p-5 pt-4">
          <div className="space-y-3">
            <Field label="Nombre comercial">
              <Input defaultValue="Depósito Emmanuel" />
            </Field>
            <Field label="Moneda">
              <Input defaultValue="GTQ — Quetzal" readOnly className="text-ink-2" />
            </Field>
            <Field label="Correo de acceso">
              <Input defaultValue="admin@depositoemmanuel.com.gt" />
            </Field>
          </div>
          <button className="btn btn-primary mt-4 w-full">Guardar cambios</button>
        </Card>
      </div>
    </div>
  );
}
