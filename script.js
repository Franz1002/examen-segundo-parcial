let db;

document.addEventListener("DOMContentLoaded", () => {
    const request = indexedDB.open("ExamenDB", 1);

    request.onerror = (e) => console.log("Error al abrir DB", e);

    request.onsuccess = (e) => {
        db = e.target.result;
        console.log("Base de datos lista");
        cargarClientesEnSelect();
        mostrarClientes();
        mostrarPedidos();

    };

    request.onupgradeneeded = (e) => {
        db = e.target.result;

        const clientesStore = db.createObjectStore("clientes", {
            keyPath: "id",
            autoIncrement: true,
        });
        clientesStore.createIndex("nombre", "nombre", { unique: false });
        clientesStore.createIndex("ci", "ci", { unique: true });

        const pedidosStore = db.createObjectStore("pedidos", {
            keyPath: "id",
            autoIncrement: true,
        });
        pedidosStore.createIndex("producto", "producto", { unique: false });
        pedidosStore.createIndex("cantidad", "cantidad", { unique: false });
        pedidosStore.createIndex("cliente", "cliente", { unique: false });
    };

    document.getElementById("btnAgregarCliente").addEventListener("click", agregarCliente);
    document.getElementById("btnBorrarCliente").addEventListener("click", borrarCliente);
    document.getElementById("btnAgregarPedido").addEventListener("click", agregarPedido);
});

function agregarCliente() {
    const nombre = document.getElementById("nombreCliente").value.trim();
    const ci = document.getElementById("ciCliente").value.trim();

    if (!nombre || !ci)
        return Swal.fire({
            icon: "error",
            title: "Error...",
            text: "Debe llenar todos los campos del cliente",
        });

    const trans = db.transaction("clientes", "readwrite");
    const store = trans.objectStore("clientes");
    const cliente = { nombre, ci };

    const request = store.add(cliente);

    request.onsuccess = () => {
        document.getElementById("nombreCliente").value = "";
        document.getElementById("ciCliente").value = "";
        cargarClientesEnSelect();
        mostrarClientes();
        Swal.fire({
            title: "Registrado",
            text: "Cliente agregado correctamente!",
            icon: "success",
        });
    };

    request.onerror = () =>
        Swal.fire({
            icon: "error",
            title: "Error...",
            text: "El CI ya existe",
        });
}
function mostrarClientes() {
    const contenedor = document.getElementById("listaClientes");
    contenedor.innerHTML = "";

    const trans = db.transaction("clientes", "readonly");
    const store = trans.objectStore("clientes");

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const { id, nombre, ci } = cursor.value;
            const div = document.createElement("div");
            div.classList.add("cliente-item");
            div.innerHTML = `
        <p><strong>${nombre}</strong> — CI: ${ci}</p>
        <div class="cliente-actions">
          <button onclick="editarCliente(${id})">Editar</button>
          <button onclick="eliminarCliente(${id})">Eliminar</button>
        </div>
      `;
            contenedor.appendChild(div);
            cursor.continue();
        }
    };
}
function editarCliente(id) {
    const trans = db.transaction("clientes", "readonly");
    const store = trans.objectStore("clientes");
    store.get(id).onsuccess = (e) => {
        const cliente = e.target.result;
        document.getElementById("nombreCliente").value = cliente.nombre;
        document.getElementById("ciCliente").value = cliente.ci;
        document.getElementById("btnActualizarCliente").dataset.id = id; // guardamos el id
    };
}
document.getElementById("btnActualizarCliente").addEventListener("click", () => {
    const id = document.getElementById("btnActualizarCliente").dataset.id;
    if (!id) {
        return Swal.fire({
            icon: "info",
            title: "Atención",
            text: "Seleccione un cliente desde la lista para editar",
        });
    }
    const nombre = document.getElementById("nombreCliente").value.trim();
    const ci = document.getElementById("ciCliente").value.trim();

    if (!nombre || !ci) {
        return Swal.fire({
            icon: "error",
            title: "Error",
            text: "Debe llenar ambos campos",
        });
    }
    const trans = db.transaction("clientes", "readwrite");
    const store = trans.objectStore("clientes");
    store.get(Number(id)).onsuccess = (e) => {
        const cliente = e.target.result;
        cliente.nombre = nombre;
        cliente.ci = ci;
        store.put(cliente);
    };

    trans.oncomplete = () => {
        document.getElementById("btnActualizarCliente").removeAttribute("data-id");
        document.getElementById("nombreCliente").value = "";
        document.getElementById("ciCliente").value = "";
        cargarClientesEnSelect();
        mostrarClientes();
        Swal.fire({
            title: "Actualizado",
            text: "Cliente modificado correctamente",
            icon: "success",
        });
    };
});
function eliminarCliente(id) {
    const trans = db.transaction("clientes", "readwrite");
    const store = trans.objectStore("clientes");
    store.delete(id);
    trans.oncomplete = () => {
        cargarClientesEnSelect();
        mostrarClientes();
        Swal.fire({
            title: "Eliminado",
            text: "Cliente eliminado correctamente",
            icon: "success",
        });
    };
}

function borrarCliente() {
    const ci = document.getElementById("ciCliente").value.trim();
    if (!ci)
        return Swal.fire({
            icon: "error",
            title: "Error...",
            text: "Ingrese el CI del cliente a eliminar",
        });

    const trans = db.transaction("clientes", "readwrite");
    const store = trans.objectStore("clientes");
    const index = store.index("ci");
    const req = index.openCursor(IDBKeyRange.only(ci));

    req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            store.delete(cursor.primaryKey);
            document.getElementById("ciCliente").value = "";
            cargarClientesEnSelect();
            Swal.fire({
                title: "Eliminado",
                text: "Cliente eliminado correctamente!",
                icon: "success",
            });
        } else {
            Swal.fire({
                icon: "error",
                title: "Error...",
                text: "Cliente no encontrado",
            });
        }
    };
}

function cargarClientesEnSelect() {
    const select = document.getElementById("selectCliente");
    select.innerHTML = "";

    const trans = db.transaction("clientes", "readonly");
    const store = trans.objectStore("clientes");

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const opt = document.createElement("option");
            opt.value = cursor.value.nombre;
            opt.textContent = cursor.value.nombre;
            select.appendChild(opt);
            cursor.continue();
        }
    };
}

function agregarPedido() {
    const producto = document.getElementById("productoPedido").value.trim();
    const cantidad = document.getElementById("cantidadPedido").value.trim();
    const cliente = document.getElementById("selectCliente").value;

    if (!producto || !cantidad || !cliente)
        return Swal.fire({
            icon: "error",
            title: "Error...",
            text: "Complete todos los campos del pedido",
        });

    const trans = db.transaction("pedidos", "readwrite");
    const store = trans.objectStore("pedidos");
    store.add({ producto, cantidad, cliente });

    trans.oncomplete = () => {
        mostrarPedidos();
        Swal.fire({
            title: "Registrado",
            text: "Pedido agregado correctamente!",
            icon: "success",
        });
    };
}

function mostrarPedidos() {
    const tbody = document.querySelector(".review-table tbody");
    tbody.innerHTML = "";

    const trans = db.transaction("pedidos", "readonly");
    const store = trans.objectStore("pedidos");

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const { id, producto, cantidad, cliente } = cursor.value;
            const tr = document.createElement("tr");
            tr.setAttribute("data-id", id);

            tr.innerHTML = `
        <td class="prod">${producto}</td>
        <td class="cant">${cantidad}</td>
        <td class="cli">${cliente}</td>
        <td>
          <button class="btn-actualizar" onclick="activarEdicion(${id})">Actualizar</button>
          <button class="btn-borrar" onclick="borrarPedido(${id})">Borrar</button>
        </td>
      `;

            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function activarEdicion(id) {
    const fila = document.querySelector(`tr[data-id='${id}']`);
    const tdProducto = fila.querySelector(".prod");
    const tdCantidad = fila.querySelector(".cant");
    const btnActualizar = fila.querySelector(".btn-actualizar");

    const productoActual = tdProducto.textContent;
    const cantidadActual = tdCantidad.textContent;

    tdProducto.innerHTML = `<input type="text" id="edit-prod-${id}" value="${productoActual}">`;
    tdCantidad.innerHTML = `<input type="number" id="edit-cant-${id}" value="${cantidadActual}">`;

    btnActualizar.textContent = "Guardar";
    btnActualizar.onclick = () => guardarEdicion(id);
}

function guardarEdicion(id) {
    const producto = document.getElementById(`edit-prod-${id}`).value.trim();
    const cantidad = document.getElementById(`edit-cant-${id}`).value.trim();

    if (!producto || !cantidad)
        return Swal.fire({
            icon: "error",
            title: "Error...",
            text: "Los campos no pueden estar vacíos",
        });

    const trans = db.transaction("pedidos", "readwrite");
    const store = trans.objectStore("pedidos");

    store.get(id).onsuccess = (e) => {
        const pedido = e.target.result;
        pedido.producto = producto;
        pedido.cantidad = cantidad;
        store.put(pedido);
    };

    trans.oncomplete = () => {
        mostrarPedidos();
        Swal.fire({
            title: "Actualizado",
            text: "Pedido modificado correctamente!",
            icon: "success",
        });
    };
}

function borrarPedido(id) {
    const trans = db.transaction("pedidos", "readwrite");
    const store = trans.objectStore("pedidos");
    store.delete(id);
    trans.oncomplete = () => mostrarPedidos();
}
