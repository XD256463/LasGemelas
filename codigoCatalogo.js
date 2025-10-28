document.addEventListener('DOMContentLoaded', () => {
    let cart = [];
    let cartCount = 0;
    let cartTotal = 0;

    const cartCountElement = document.getElementById('cartCount');
    const cartItemsElement = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const clearCartButton = document.getElementById('clearCart');
    const checkoutButton = document.getElementById('checkout');
    const printTicketButton = document.getElementById('printTicket');

    function updateCartDisplay() {
        cartCountElement.textContent = cartCount;
        cartTotalElement.textContent = `S/.${cartTotal.toFixed(2)}`;

        if (cart.length === 0) {
            cartItemsElement.innerHTML = '<p class="text-center text-muted">Tu carrito está vacío</p>';
            checkoutButton.disabled = true;
            clearCartButton.disabled = true;
        } else {
            let cartHTML = '';
            cart.forEach((item, index) => {
                cartHTML += `
                    <div class="d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
                        <div>
                            <h6 class="mb-1">${item.name}</h6>
                            <small class="text-muted">${item.type === 'venta' ? 'Compra' : 'Alquiler'}</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="me-3">S/.${item.price}</span>
                            <button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
            cartItemsElement.innerHTML = cartHTML;
            checkoutButton.disabled = false;
            clearCartButton.disabled = false;

            document.querySelectorAll('.remove-item').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    removeFromCart(index);
                });
            });
        }
    }

    function addToCart(name, price, type) {
        const item = {
            name: name,
            price: parseFloat(price),
            type: type,
            id: Date.now()
        };

        cart.push(item);
        cartCount++;
        cartTotal += item.price;
        updateCartDisplay();

        const toast = document.createElement('div');
        toast.className = 'position-fixed top-0 end-0 p-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast show" role="alert">
                <div class="toast-header">
                    <strong class="me-auto">✅ Agregado al carrito</strong>
                </div>
                <div class="toast-body">
                    ${name} - S/.${price}
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    function removeFromCart(index) {
        const item = cart[index];
        cartTotal -= item.price;
        cartCount--;
        cart.splice(index, 1);
        updateCartDisplay();
    }

    function clearCart() {
        cart = [];
        cartCount = 0;
        cartTotal = 0;
        updateCartDisplay();
    }

    function generateTicket() {
        const now = new Date();
        const ticketNumber = Math.floor(Math.random() * 1000000);
        
        let ticketHTML = `
            <div class="ticket-content" style="
                font-family: 'Courier New', monospace; 
                background: #ffffff; 
                padding: 25px; 
                border: 2px dashed #333; 
                border-radius: 8px; 
                max-width: 100%; 
                margin: 0 auto; 
                font-size: 16px;
                line-height: 1.4;
            ">
                <div class="text-center mb-4">
                    <h3 style="margin: 0 0 10px 0; font-size: 24px; color: #333;">🎭 LAS GEMELAS 🎭</h3>
                    <p style="margin: 3px 0; font-size: 14px;">Disfraces y Accesorios</p>
                    <p style="margin: 3px 0; font-size: 13px;">📍 Av. Principal 123, Lima</p>
                    <p style="margin: 3px 0; font-size: 13px;">📞 Tel: (01) 123-4567</p>
                    <div style="border-top: 1px dashed #333; margin: 15px 0;"></div>
                </div>
                
                <div style="margin-bottom: 20px; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span><strong>Ticket #:</strong></span>
                        <span>${ticketNumber}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span><strong>Fecha:</strong></span>
                        <span>${now.toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span><strong>Hora:</strong></span>
                        <span>${now.toLocaleTimeString()}</span>
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #333; margin: 15px 0;"></div>
                <h4 style="text-align: center; margin: 15px 0; font-size: 18px;">DETALLE DE COMPRA</h4>
                <div style="border-top: 1px dashed #333; margin: 15px 0;"></div>
                
                <div class="items-list" style="font-size: 14px;">
        `;

        cart.forEach(item => {
            ticketHTML += `
                <div style="
                    display: flex; 
                    justify-content: space-between; 
                    margin: 12px 0; 
                    padding: 8px 0; 
                    border-bottom: 1px dotted #ccc;
                ">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 3px;">${item.name}</div>
                        <div style="font-size: 12px; color: #666;">(${item.type === 'venta' ? 'Compra' : 'Alquiler'})</div>
                    </div>
                    <div style="font-weight: bold; text-align: right; font-size: 16px;">
                        S/.${item.price.toFixed(2)}
                    </div>
                </div>
            `;
        });

        ticketHTML += `
                </div>
                
                <div style="border-top: 2px solid #333; margin: 20px 0; padding-top: 15px;">
                    <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                        <span>TOTAL A PAGAR:</span>
                        <span>S/.${cartTotal.toFixed(2)}</span>
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #333; margin: 15px 0; padding-top: 15px; text-align: center; font-size: 13px;">
                    <p style="margin: 5px 0;">¡Gracias por tu compra!</p>
                    <p style="margin: 5px 0;">🎭 "Bueno, Bonito y Barato" 🎭</p>
                    <p style="margin: 5px 0;">Conserva este ticket como comprobante</p>
                    <p style="margin: 10px 0; font-size: 12px;">*** TICKET VÁLIDO ***</p>
                </div>
            </div>
        `;

        document.getElementById('ticketContent').innerHTML = ticketHTML;
    }

    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const price = e.target.getAttribute('data-price');
            const type = e.target.getAttribute('data-type');
            addToCart(name, price, type);
        });
    });

    clearCartButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
            clearCart();
        }
    });

    checkoutButton.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Tu carrito está vacío');
            return;
        }

        // Guardar datos del carrito en localStorage para la página de checkout
        localStorage.setItem('checkoutCart', JSON.stringify(cart));
        
        // Redirigir a la página de checkout
        window.location.href = 'checkout.html';
    });

    printTicketButton.addEventListener('click', () => {
        const ticketContent = document.getElementById('ticketContent').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket de Compra - Las Gemelas</title>
                    <style>
                        body { font-family: monospace; margin: 20px; }
                        .ticket-content { max-width: 400px; margin: 0 auto; }
                    </style>
                </head>
                <body>
                    ${ticketContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    });

    updateCartDisplay();
});