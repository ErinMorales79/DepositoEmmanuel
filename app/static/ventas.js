// estado
let carrito = [];
let total = 0;
let productosBase = [];
let clientesBase = [];
let stockPorProducto = {};

//helpers
function $(id) {
    return document.getElementById(id);
}

function obtenerJSON(idScript) {
    const script = $(idScript);
    if (!script) return [];
    try {
        return JSON.parse(script.textContent);
    } catch {
        return [];
    }
}

function mostrarMensaje(texto, tipo = "error") {
    const box = $("mensaje");
    if (!box) return;

    box.className = "mensaje";
    box.classList.remove("oculto", "mensaje-error", "mensaje-ok", "mensaje-info");

    if (tipo === "ok") box.classList.add("mensaje-ok");
    else if (tipo === "info") box.classList.add("mensaje-info");
    else box.classList.add("mensaje-error");

    box.textContent = texto;

    clearTimeout(window.__mensajeTimer);
    window.__mensajeTimer = setTimeout(() => {
        box.classList.add("oculto");
    }, 2800);
}

function actualizarEstadoBotonGuardar() {
    const btn = $("btnGuardar");
    const cliente = $("cliente")?.value;

    if (!btn) return;

    if (!cliente || carrito.length === 0) {
        btn.disabled = true;
    } else {
        btn.disabled = false;
    }
}

function actualizarStockBadge(stock) {
    const badge = $("stock");
    if (!badge) return;

    badge.textContent = stock;

    badge.classList.remove("stock-cero", "stock-bajo", "stock-ok");

    if (stock <= 0) {
        badge.classList.add("stock-cero");
    } else if (stock <= 5) {
        badge.classList.add("stock-bajo");
    } else {
        badge.classList.add("stock-ok");
    }
}

// render selects
function renderProductosSelect(lista) {
    const select = $("producto");
    if (!select) return;

    select.innerHTML = "";

    lista.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.nombre} - Q${Number(p.precio_venta).toFixed(2)}`;
        select.appendChild(opt);
    });
}

function renderClientesSelect(lista) {
    const select = $("cliente");
    if (!select) return;

    const seleccionadoActual = select.value;
    select.innerHTML = "";

    lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        select.appendChild(opt);
    });

    // intentamos mantener selección si sigue existiendo
    if (lista.some(c => String(c.id) === String(seleccionadoActual))) {
        select.value = seleccionadoActual;
    }

    actualizarEstadoBotonGuardar();
}

// productos
function filtrarProductos() {
    const filtro = $("buscar").value.toLowerCase().trim();

    const filtrados = productosBase.filter(p =>
        p.nombre.toLowerCase().includes(filtro)
    );

    renderProductosSelect(filtrados);

    if (filtrados.length > 0) {
        mostrarStock();
    } else {
        actualizarStockBadge(0);
    }
}

function mostrarStock() {
    const productoId = $("producto")?.value;

    if (!productoId) {
        actualizarStockBadge(0);
        return;
    }

    fetch(`/api/stock/${productoId}`)
        .then(r => r.json())
        .then(data => {
            const stock = Number(data.stock ?? 0);
            stockPorProducto[productoId] = stock;
            actualizarStockBadge(stock);
        })
        .catch(() => {
            stockPorProducto[productoId] = 0;
            actualizarStockBadge(0);
            mostrarMensaje("No se pudo consultar el stock", "error");
        });
}

// clientes
function filtrarClientes() {
    const filtro = $("buscarCliente").value.toLowerCase().trim();

    const filtrados = clientesBase.filter(c =>
        c.nombre.toLowerCase().includes(filtro)
    );

    renderClientesSelect(filtrados);
}

function autocompletarDireccionCliente() {
    const clienteId = $("cliente")?.value;
    const cliente = clientesBase.find(c => String(c.id) === String(clienteId));

    if (cliente && $("direccion") && !$("direccion").dataset.editado) {
        $("direccion").value = cliente.direccion || "";
    }

    actualizarEstadoBotonGuardar();
}

// carrito
function agregarProducto() {
    const productoId = parseInt($("producto")?.value || "0");
    const cantidad = parseInt($("cantidad")?.value || "0");
    const stock = Number($("stock")?.textContent || "0");

    if (!productoId) {
        mostrarMensaje("Debes seleccionar un producto", "error");
        return;
    }

    const producto = productosBase.find(p => p.id === productoId);
    if (!producto) {
        mostrarMensaje("Producto inválido", "error");
        return;
    }

    if (cantidad <= 0) {
        mostrarMensaje("La cantidad debe ser mayor a cero", "error");
        return;
    }

    if (stock === 0 || cantidad > stock) {
        mostrarMensaje("No hay stock suficiente", "error");
        return;
    }

    const existente = carrito.find(i => i.producto_id === productoId);

    if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        if (nuevaCantidad > stock) {
            mostrarMensaje("Supera el stock disponible", "error");
            return;
        }

        existente.cantidad = nuevaCantidad;
        existente.subtotal = existente.cantidad * existente.precio;
    } else {
        carrito.push({
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio_venta),
            cantidad,
            subtotal: cantidad * Number(producto.precio_venta)
        });
    }

    renderCarrito();
    mostrarMensaje("Producto agregado al carrito", "ok");
}

function renderCarrito() {
    const tbody = document.querySelector("#tabla tbody");
    const contador = $("contadorItems");

    if (!tbody) return;

    tbody.innerHTML = "";

    carrito.forEach((item, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td class="celda-producto">${item.nombre}</td>
            <td>
                <div class="qty-controls">
                    <button class="btn-mini" onclick="cambiarCantidad(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button class="btn-mini" onclick="cambiarCantidad(${index}, 1)">+</button>
                </div>
            </td>
            <td>Q ${item.precio.toFixed(2)}</td>
            <td>Q ${item.subtotal.toFixed(2)}</td>
            <td><button class="btn-eliminar" onclick="eliminarProducto(${index})">❌</button></td>
        `;

        tbody.appendChild(tr);
    });

    total = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    $("total").textContent = total.toFixed(2);

    if (contador) {
        contador.textContent = `${carrito.length} item${carrito.length === 1 ? "" : "s"}`;
    }

    actualizarEstadoBotonGuardar();
}

function cambiarCantidad(index, cambio) {
    const item = carrito[index];
    if (!item) return;

    if (cambio > 0) {
        const stockActual = stockPorProducto[item.producto_id] ?? 0;
        if (item.cantidad + 1 > stockActual) {
            mostrarMensaje("No hay suficiente stock para aumentar", "error");
            return;
        }
    }

    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        carrito.splice(index, 1);
    } else {
        item.subtotal = item.cantidad * item.precio;
    }

    renderCarrito();
}

function eliminarProducto(index) {
    carrito.splice(index, 1);
    renderCarrito();
    mostrarMensaje("Producto eliminado del carrito", "info");
}

// guardar
function guardarVenta() {
    const cliente_id = $("cliente")?.value;
    const direccion = $("direccion")?.value || "";
    const tipo_pago = $("tipo_pago")?.value || "EFECTIVO";
    const observaciones = $("observaciones")?.value || "";

    if (!cliente_id) {
        mostrarMensaje("Debes seleccionar un cliente", "error");
        return;
    }

    if (carrito.length === 0) {
        mostrarMensaje("Debes agregar al menos un producto", "error");
        return;
    }

    const btn = $("btnGuardar");
    btn.disabled = true;
    btn.textContent = "Guardando...";

    fetch("/api/venta", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            cliente_id,
            direccion,
            tipo_pago,
            observaciones,
            items: carrito.map(i => ({
                producto_id: i.producto_id,
                cantidad: i.cantidad,
                subtotal: i.subtotal
            }))
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            mostrarMensaje(data.error, "error");
            btn.disabled = false;
            btn.textContent = "Guardar Venta";
            actualizarEstadoBotonGuardar();
            return;
        }

        mostrarMensaje("Venta guardada correctamente", "ok");

        setTimeout(() => {
            location.reload();
        }, 1200);
    })
    .catch(() => {
        mostrarMensaje("Ocurrió un error al guardar la venta", "error");
        btn.disabled = false;
        btn.textContent = "Guardar Venta";
        actualizarEstadoBotonGuardar();
    });
}

// eventos
document.addEventListener("DOMContentLoaded", () => {
    productosBase = obtenerJSON("productos-data");
    clientesBase = obtenerJSON("clientes-data");

    renderProductosSelect(productosBase);
    renderClientesSelect(clientesBase);

    $("buscar")?.addEventListener("keyup", filtrarProductos);
    $("buscarCliente")?.addEventListener("keyup", filtrarClientes);
    $("producto")?.addEventListener("change", mostrarStock);
    $("cliente")?.addEventListener("change", autocompletarDireccionCliente);
    $("cantidad")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            agregarProducto();
        }
    });

    $("direccion")?.addEventListener("input", () => {
        $("direccion").dataset.editado = "true";
    });

    mostrarStock();
    autocompletarDireccionCliente();
    actualizarEstadoBotonGuardar();
});