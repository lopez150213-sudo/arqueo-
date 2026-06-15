document.addEventListener("DOMContentLoaded", () => {
    asignarEventosDinamicos();
});

function asignarEventosDinamicos() {
    document.querySelectorAll("input").forEach(input => {
        input.removeEventListener("input", recalcularTodo);
        input.addEventListener("input", recalcularTodo);
    });
}

function agregarFilaFactura() {
    const tbody = document.getElementById("tbodyFacturas");
    const nuevaFila = document.createElement("tr");
    
    // El atributo data-label permite mantener el texto identificador en la versión móvil vertical
    nuevaFila.innerHTML = `
        <td data-label="Monto (C$)"><input type="number" class="monto-factura" value="0" step="0.01"></td>
        <td data-label="Cantidad"><input type="number" class="cant-factura" value="0" min="0"></td>
        <td data-label="Subtotal (C$)" class="subtotal-factura">0.00</td>
        <td><button class="btn-eliminar" onclick="eliminarFila(this)">×</button></td>
    `;
    
    tbody.appendChild(nuevaFila);
    asignarEventosDinamicos();
    recalcularTodo();
}

function eliminarFila(boton) {
    const fila = boton.closest("tr");
    fila.remove();
    recalcularTodo();
}

function recalcularTodo() {
    let totalSistema = 0;
    const filasFacturas = document.querySelectorAll("#tbodyFacturas tr");
    
    filasFacturas.forEach(fila => {
        const inputMonto = fila.querySelector(".monto-factura");
        const inputCant = fila.querySelector(".cant-factura");
        
        if (inputMonto && inputCant) {
            const valorMonto = parseFloat(inputMonto.value) || 0;
            const cantidad = parseInt(inputCant.value) || 0;
            const subtotal = valorMonto * cantidad;
            
            fila.querySelector(".subtotal-factura").textContent = subtotal.toFixed(2);
            totalSistema += subtotal;
        }
    });
    document.getElementById("lblTotalCobrado").textContent = totalSistema.toFixed(2);

    let totalReal = 0;

    // Calcular Dólares
    const tc = parseFloat(document.getElementById("numTipoCambio").value) || 36.6243;
    const cantDolar = parseFloat(document.getElementById("cantDolar").value) || 0;
    const subtotalDolar = cantDolar * tc;
    document.getElementById("subtotalDolar").textContent = subtotalDolar.toFixed(2);
    totalReal += subtotalDolar;

    // Billetes Nacionales
    const filasEfectivo = document.querySelectorAll(".cant-efectivo");
    filasEfectivo.forEach(input => {
        const valorNominal = parseInt(input.getAttribute("data-valor"));
        const cantidad = parseInt(input.value) || 0;
        const subtotal = valorNominal * cantidad;
        
        input.closest("tr").querySelector(".subtotal-efectivo").textContent = subtotal.toFixed(2);
        totalReal += subtotal;
    });

    // Vauchers
    const montoVaucher = parseFloat(document.getElementById("montoVaucher").value) || 0;
    document.getElementById("subtotalVaucher").textContent = montoVaucher.toFixed(2);
    totalReal += montoVaucher;

    document.getElementById("lblTotalEfectivo").textContent = totalReal.toFixed(2);

    // Diferencia balanceada
    const diferencia = totalReal - totalSistema;
    const cajaDif = document.getElementById("cajaDiferencia");

    if (Math.abs(diferencia) < 0.05) {
        cajaDif.className = "caja-final balance-ok";
        cajaDif.innerHTML = `✅ CAJA CUADRADA: C$ ${diferencia.toFixed(2)}`;
    } else if (diferencia > 0) {
        cajaDif.className = "caja-final balance-ok";
        cajaDif.innerHTML = `⚠️ SOBRANTE: C$ ${diferencia.toFixed(2)}`;
    } else {
        cajaDif.className = "caja-final balance-error";
        cajaDif.innerHTML = `🚨 FALTANTE: C$ ${diferencia.toFixed(2)}`;
    }
}

function enviarReporteWhatsApp() {
    const selectorGestor = document.getElementById("selectGestor");
    const numeroDestino = selectorGestor.value;
    const gestorNombre = selectorGestor.options[selectorGestor.selectedIndex].text;
    const tc = parseFloat(document.getElementById("numTipoCambio").value) || 36.6243;

    if (!numeroDestino) {
        alert("Por favor, selecciona un gestor de la lista.");
        return;
    }

    let totalSistema = 0;
    let mensajeFacturas = "";
    const filasFacturas = document.querySelectorAll("#tbodyFacturas tr");
    
    filasFacturas.forEach(fila => {
        const inputMonto = fila.querySelector(".monto-factura");
        const inputCant = fila.querySelector(".cant-factura");
        
        if(inputMonto && inputCant) {
            const cantidad = parseInt(inputCant.value) || 0;
            if(cantidad > 0) {
                const valor = parseFloat(inputMonto.value) || 0;
                const sub = valor * cantidad;
                mensajeFacturas += `• C$ ${valor.toFixed(2)} x ${cantidad}: C$ ${sub.toFixed(2)}\n`;
                totalSistema += sub;
            }
        }
    });

    let totalReal = 0;
    let mensajeEfectivo = "";

    const cantDolar = parseFloat(document.getElementById("cantDolar").value) || 0;
    if(cantDolar > 0) {
        const subDolar = cantDolar * tc;
        mensajeEfectivo += `• Dólares ($): $ ${cantDolar} (C$ ${subDolar.toFixed(2)})\n`;
        totalReal += subDolar;
    }

    document.querySelectorAll(".cant-efectivo").forEach(input => {
        const cantidad = parseInt(input.value) || 0;
        if(cantidad > 0) {
            const valor = parseInt(input.getAttribute("data-valor"));
            const sub = valor * cantidad;
            mensajeEfectivo += `• Billetes C$ ${valor} x ${cantidad}: C$ ${sub.toFixed(2)}\n`;
            totalReal += sub;
        }
    });

    const montoVaucher = parseFloat(document.getElementById("montoVaucher").value) || 0;
    if(montoVaucher > 0) {
        mensajeEfectivo += `• Vauchers/Transf: C$ ${montoVaucher.toFixed(2)}\n`;
        totalReal += montoVaucher;
    }

    const diferencia = totalReal - totalSistema;
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString('es-NI') + ' ' + ahora.toLocaleTimeString('es-NI', {hour: '2-digit', minute:'2-digit'});

    let mensaje = `*CONCILIACIÓN Y ARQUEO DE CAJA* 📑\n`;
    mensaje += `*TELECABLE Granada*\n`;
    mensaje += `----------------------------------------\n`;
    mensaje += `👤 *Gestor:* ${gestorNombre}\n`;
    mensaje += `📅 *Fecha:* ${fechaFormateada}\n`;
    mensaje += `💵 *T/C Dólar:* C$ ${tc.toFixed(4)}\n`;
    mensaje += `----------------------------------------\n\n`;

    mensaje += `📋 *DETALLE FACTURACIÓN (SISTEMA):*\n`;
    mensaje += mensajeFacturas || "_No se registraron cobros_\n";
    mensaje += `👉 *TOTAL COBRADO:* C$ ${totalSistema.toFixed(2)}\n\n`;

    mensaje += `💵 *DESGLOSE DE ENTREGA REAL:*\n`;
    mensaje += mensajeEfectivo || "_No se registró dinero físico_\n";
    mensaje += `👉 *TOTAL RECAUDADO:* C$ ${totalReal.toFixed(2)}\n\n`;

    mensaje += `----------------------------------------\n`;
    if (Math.abs(diferencia) < 0.05) {
        mensaje += `✅ *RESULTADO:* CAJA CUADRADA 🎉\n`;
    } else if (diferencia > 0) {
        mensaje += `⚠️ *RESULTADO: SOBRANTE DE C$ ${diferencia.toFixed(2)}*\n`;
    } else {
        mensaje += `🚨 *RESULTADO: FALTANTE DE C$ ${Math.abs(diferencia).toFixed(2)}*\n`;
    }
    mensaje += `----------------------------------------\n`;
    mensaje += `_Reporte de control automatizado._`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    window.open(`https://wa.me/505${numeroDestino}?text=${mensajeCodificado}`, '_blank');
}