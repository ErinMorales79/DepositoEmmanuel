// Formas de las respuestas del backend (/api/*)

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  email: string;
  rol: string;
  handle: string;
  iniciales: string;
  modulos: string[];
  solo_lectura: string[];
}

export interface Cliente {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  es_ocasional: boolean;
  creado_en: string;
  ventas_count: number;
  ventas_total: number;
}

export interface ClienteVenta {
  id: number;
  fecha: string;
  total: number;
  estado: "FINALIZADA" | "ACTIVA" | "ANULADA";
  canal: "MOSTRADOR" | "MOTO" | "CAMION";
}

export interface ClienteDetalle {
  cliente: Omit<Cliente, "ventas_count" | "ventas_total">;
  ventas: ClienteVenta[];
}

export interface Resumen {
  ventas: { total: number; count: number };
  compras: { total: number; count: number };
  ultima_venta: string | null;
}

export interface Movimiento {
  hora: string;
  fecha: string;
  tipo: string;
  producto: string;
  cantidad: number;
  referencia: string;
}

export interface Ubicacion {
  nombre: string;
  unidades: number;
  nota: string;
}

export interface RutaActiva {
  id: number;
  correlativo: string;
  estado: string;
  piloto: string;
  camion: string;
  fecha?: string;
}

export interface DashboardData {
  productos_activos: number;
  productos_total: number;
  unidades_bodega: number;
  bajo_minimo: { id: number; nombre: string; stock: number; minimo: number }[];
  ruta_activa: RutaActiva | null;
  movimientos: Movimiento[];
  ubicaciones: Ubicacion[];
}

export interface Producto {
  id: number;
  codigo_barra: string;
  nombre: string;
  marca_id: number;
  marca: string;
  proveedor_id: number;
  proveedor: string;
  unidades_por_fardo: number;
  precio_compra: number;
  precio_venta: number;
  es_retornable: boolean;
  requiere_vencimiento: boolean;
  stock_minimo: number;
  activo: boolean;
  stock: number;
}

export interface Catalogos {
  marcas: { id: number; nombre: string }[];
  proveedores: { id: number; nombre: string }[];
  clientes: { id: number; nombre: string; direccion: string }[];
  ubicaciones: { id: number; nombre: string }[];
}

export interface StockData {
  resumen: { producto_id: number; producto: string; stock: number; minimo: number }[];
  lotes: {
    lote_id: number;
    producto: string;
    vence: string;
    cantidad: number;
    ubicacion: string;
  }[];
}

export interface Venta {
  id: number;
  fecha: string;
  fechaISO: string;
  cliente: string;
  total: number;
  estado: "FINALIZADA" | "ACTIVA" | "ANULADA";
  canal: "MOSTRADOR" | "MOTO" | "CAMION";
}

export interface Compra {
  id: number;
  fecha: string;
  fechaISO: string;
  proveedor: string;
  factura: string;
  total: number;
  estado: "FINALIZADA" | "BORRADOR";
}

export interface DistribucionData {
  ruta_activa: RutaActiva | null;
  detalle: {
    producto_id: number;
    producto: string;
    salida: number;
    regreso: number;
    precio: number;
  }[];
}

export interface ReporteVentas {
  rows: Venta[];
  resumen: {
    count: number;
    total_finalizado: number;
    ticket_promedio: number;
    anuladas: number;
  };
  por_dia: { label: string; value: number }[];
}

export interface ReporteCompras {
  rows: Compra[];
  resumen: { count: number; total: number; promedio: number; proveedores: number };
  por_dia: { label: string; value: number }[];
}

export interface ReporteRutas {
  rows: {
    id: number;
    correlativo: string;
    fecha: string;
    fechaISO: string;
    piloto: string;
    camion: string;
    estado: "ABIERTA" | "CERRADA";
    unidadesSalida: number;
    unidadesVendidas: number;
    totalSistema: number;
    efectivo: number;
    diferencia: number;
  }[];
  resumen: {
    count: number;
    unidades: number;
    total_sistema: number;
    diferencia: number;
  };
}
