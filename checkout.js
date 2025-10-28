document.addEventListener('DOMContentLoaded', () => {
    let orderData = [];
    let orderTotal = 0;
    let orderNumber = '';

    // Mapeo de productos con imágenes
    const productImages = {
        'Disfraz de Guepardo': 'img/guepardo-cata.JPG',
        'Disfraz de Mario Bros': 'img/mario-cata.JPG',
        'Disfraz de Michael Jackson': 'img/michael-cata.JPG',
        'Disfraz de Princesa': 'img/princesa-cata.JPG',
        'Disfraz de Romano': 'img/roma-cata.JPG',
        'Disfraz de Stitch': 'img/stich-cata.JPG',
        'Corona Real': 'img/corona-cata.JPG',
        'Moños Abrazadores': 'img/monos-cata.JPG'
    };

    function loadOrderData() {
        const cartData = localStorage.getItem('checkoutCart');
        if (cartData) {
            orderData = JSON.parse(cartData);
            displayOrderItems();
            calculateTotal();
        } else {
            // Si no hay datos, redirigir al catálogo
            window.location.href = 'catalogo.html';
        }
    }

    function displayOrderItems() {
        const checkoutItemsContainer = document.getElementById('checkoutItems');
        let itemsHTML = '';

        orderData.forEach((item, index) => {
            const imageSrc = productImages[item.name] || 'img/default-product.jpg';
            itemsHTML += `
                <div class="card mb-3">
                    <div class="row g-0">
                        <div class="col-md-3">
                            <img src="${imageSrc}" class="img-fluid rounded-start h-100" alt="${item.name}" style="object-fit: cover;">
                        </div>
                        <div class="col-md-9">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-8">
                                        <h5 class="card-title">${item.name}</h5>
                                        <p class="card-text">
                                            <span class="badge ${item.type === 'venta' ? 'bg-success' : 'bg-warning'}">
                                                ${item.type === 'venta' ? '🛒 Compra' : '📅 Alquiler'}
                                            </span>
                                        </p>
                                        <p class="card-text">
                                            <small class="text-muted">
                                                ${item.type === 'venta' ? 'Producto para compra' : 'Producto para alquiler'}
                                            </small>
                                        </p>
                                    </div>
                                    <div class="col-md-4 text-end">
                                        <h4 class="text-primary">S/.${item.price.toFixed(2)}</h4>
                                        <button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        checkoutItemsContainer.innerHTML = itemsHTML;

        // Agregar event listeners para eliminar items
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                removeItem(index);
            });
        });
    }

    function removeItem(index) {
        orderData.splice(index, 1);
        localStorage.setItem('checkoutCart', JSON.stringify(orderData));
        
        if (orderData.length === 0) {
            window.location.href = 'catalogo.html';
        } else {
            displayOrderItems();
            calculateTotal();
        }
    }

    function calculateTotal() {
        orderTotal = orderData.reduce((total, item) => total + item.price, 0);
        
        document.getElementById('subtotal').textContent = `S/.${orderTotal.toFixed(2)}`;
        document.getElementById('totalAmount').textContent = `S/.${orderTotal.toFixed(2)}`;
    }

    function generateOrderNumber() {
        const now = new Date();
        const timestamp = now.getTime().toString().slice(-6);
        orderNumber = `LG${timestamp}`;
        return orderNumber;
    }

    function generateTicketContent() {
        const now = new Date();
        const ticketNumber = generateOrderNumber();
        
        let ticketContent = `
        LAS GEMELAS
    Disfraces y Accesorios
   Av. Principal 123, Lima
     Tel: (01) 123-4567

================================
Ticket #: ${ticketNumber}
Fecha: ${now.toLocaleDateString()}
Hora: ${now.toLocaleTimeString()}
================================

DETALLE DE COMPRA:
`;

        orderData.forEach(item => {
            ticketContent += `
${item.name}
(${item.type === 'venta' ? 'Compra' : 'Alquiler'})
                    S/.${item.price.toFixed(2)}
--------------------------------`;
        });

        ticketContent += `

TOTAL A PAGAR: S/.${orderTotal.toFixed(2)}

================================
¡Gracias por tu compra!
"Bueno, Bonito y Barato"
Conserva este ticket como comprobante
*** TICKET VALIDO ***
        `;

        return ticketContent;
    }

    function generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurar fuente
        doc.setFont("helvetica");
        
        // Título principal
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("LAS GEMELAS", 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Disfraces y Accesorios", 105, 30, { align: 'center' });
        doc.text("Av. Principal 123, Lima", 105, 40, { align: 'center' });
        doc.text("Tel: (01) 123-4567", 105, 50, { align: 'center' });
        
        // Línea separadora
        doc.line(20, 60, 190, 60);
        
        // Información del ticket
        const now = new Date();
        doc.setFontSize(12);
        doc.text(`Ticket #: ${orderNumber}`, 20, 75);
        doc.text(`Fecha: ${now.toLocaleDateString()}`, 20, 85);
        doc.text(`Hora: ${now.toLocaleTimeString()}`, 20, 95);
        
        // Línea separadora
        doc.line(20, 105, 190, 105);
        
        // Título de productos
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("DETALLE DE COMPRA:", 20, 120);
        
        // Productos
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        let yPosition = 135;
        
        orderData.forEach(item => {
            // Nombre del producto
            doc.setFont("helvetica", "bold");
            doc.text(item.name, 20, yPosition);
            
            // Tipo de servicio
            doc.setFont("helvetica", "normal");
            doc.text(`(${item.type === 'venta' ? 'Compra' : 'Alquiler'})`, 20, yPosition + 8);
            
            // Precio
            doc.setFont("helvetica", "bold");
            doc.text(`S/.${item.price.toFixed(2)}`, 170, yPosition, { align: 'right' });
            
            yPosition += 20;
        });
        
        // Línea separadora
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 15;
        
        // Total
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL A PAGAR:", 20, yPosition);
        doc.text(`S/.${orderTotal.toFixed(2)}`, 170, yPosition, { align: 'right' });
        
        // Mensaje final
        yPosition += 25;
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Gracias por tu compra!", 105, yPosition, { align: 'center' });
        doc.text('"Bueno, Bonito y Barato"', 105, yPosition + 10, { align: 'center' });
        doc.text("Conserva este ticket como comprobante", 105, yPosition + 20, { align: 'center' });
        
        yPosition += 35;
        doc.setFontSize(10);
        doc.text("*** TICKET VALIDO ***", 105, yPosition, { align: 'center' });
        
        // Descargar PDF
        doc.save(`Ticket_LasGemelas_${orderNumber}.pdf`);
    }

    function printTicket() {
        const ticketContent = generateTicketContent();
        const printWindow = window.open('', '_blank');
        
        const printHTML = `
            <html>
                <head>
                    <title>Ticket de Compra - Las Gemelas</title>
                    <style>
                        body { 
                            font-family: 'Courier New', monospace; 
                            margin: 20px; 
                            font-size: 12px;
                            line-height: 1.4;
                        }
                        .ticket-content { 
                            max-width: 300px; 
                            margin: 0 auto; 
                            white-space: pre-line;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="ticket-content">${ticketContent}</div>
                </body>
            </html>
        `;
        
        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.print();
    }

    // Event Listeners
    document.getElementById('finalizeOrder').addEventListener('click', () => {
        if (orderData.length === 0) {
            alert('No hay productos en tu pedido');
            return;
        }

        generateOrderNumber();
        document.getElementById('orderNumber').textContent = orderNumber;
        
        const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        confirmationModal.show();
        
        // Limpiar localStorage
        localStorage.removeItem('checkoutCart');
    });

    document.getElementById('downloadPDF').addEventListener('click', generatePDF);
    document.getElementById('printTicketBtn').addEventListener('click', printTicket);

    // Cargar datos al iniciar
    loadOrderData();
});