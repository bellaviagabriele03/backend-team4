// ORDINE DEL CLIENTE
export const confermaOrdineCliente = (purchase, prodotti) => {


  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .logo { max-width: 200px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .info-section { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .product-item { border-bottom: 1px solid #ddd; padding: 15px 0; }
        .product-item:last-child { border-bottom: none; }
        .price-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .total { font-size: 20px; font-weight: bold; color: #4CAF50; margin-top: 20px; padding-top: 15px; border-top: 2px solid #4CAF50; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .address { background-color: #e8f5e9; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .original-price { text-decoration: line-through; color: #999; font-size: 0.9em; }
        .discounted-price { color: #f44336; font-weight: bold; }
        .discount-badge { background-color: #ff5722; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.85em; margin-left: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>BACK TO THE RETRO</h2>
          <h1>✅ Ordine Confermato!</h1>
        </div>
        <div class="content">
          <h2>Ciao ${purchase.client_name}!</h2>
          <p>Grazie per aver acquistato da Back to the Retro! 🎮</p>
          <p><strong>Numero Ordine:</strong> #${purchase.id}</p>
          <p><strong>Data:</strong> ${new Date(purchase.created_at).toLocaleString('it-IT')}</p>
          
          <div class="info-section">
            <h3>📦 Indirizzo di Spedizione:</h3>
            <div class="address">
              <p><strong>${purchase.client_name} ${purchase.client_surname}</strong></p>
              <p>${purchase.shipping_address}</p>
              <p>${purchase.shipping_postal_code} - ${purchase.shipping_city}</p>
              <p>Tel: ${purchase.phone_number}</p>
            </div>
          </div>
          
          <div class="info-section">
            <h3>🛍️ Dettagli Ordine:</h3>
            ${prodotti.map(p => {
    const originalPrice = parseFloat(p.original_price);
    const discountedPrice = p.discounted_price ? parseFloat(p.discounted_price) : null;
    const finalPrice = discountedPrice ? originalPrice - discountedPrice : originalPrice;
    const hasDiscount = discountedPrice && discountedPrice > 0;
    const discountPercentage = hasDiscount ? Math.round((discountedPrice / originalPrice) * 100) : 0;

    return `
              <div class="product-item">
                <strong>${p.product_name}</strong>
                ${hasDiscount ? `<span class="discount-badge">-${discountPercentage}%</span>` : ''}
                <br>
                <small>Piattaforma: ${p.platform_name || 'N/A'}</small><br>
                <div class="price-row">
                  <span>Prezzo: </span>
                  <span>
                    ${hasDiscount
        ? `<span class="original-price">€${originalPrice.toFixed(2)}</span> 
                         <span class="discounted-price">€${finalPrice.toFixed(2)}</span>`
        : `€${originalPrice.toFixed(2)}`
      }
                    × ${p.quantity} = <strong>€${(p.total_price / 100).toFixed(2)}</strong>
                  </span>
                </div>
              </div>
                `;
  }).join('')}
            
            <div class="price-row" style="margin-top: 15px;">
  <span><strong>Spedizione:</strong> </span>
  <span>
    ${Number(purchase.shipping_price) === 0
      ? "Gratuita"
      : `€${Number(purchase.shipping_price).toFixed(2)}`
    }
  </span>
</div>

            
            <p class="total">Totale: €${parseFloat(purchase.total_price).toFixed(2)}</p>
          </div>
          
          <p style="margin-top: 20px;">📧 Ti terremo aggiornato via email sullo stato della spedizione!</p>
          <p>Per qualsiasi domanda, rispondi pure a questa email.</p>
        </div>
        <div class="footer">
          <h2>BACK TO THE RETRO</h2>
          <p>Back to the Retro - Il tuo negozio di videogiochi vintage</p>
          <p>Questa è una email automatica di conferma ordine.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// EMAIL DI CONFERMA AGLI ADMIN
export const notificaOrdineAdmin = (purchase, prodotti) => {


  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF5722; color: white; padding: 20px; text-align: center; }
        .logo { max-width: 200px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF5722; border-radius: 5px; }
        .product-item { border-bottom: 1px solid #ddd; padding: 15px 0; }
        .product-item:last-child { border-bottom: none; }
        .price-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .total { font-size: 22px; font-weight: bold; color: #FF5722; margin-top: 20px; padding-top: 15px; border-top: 3px solid #FF5722; }
        .urgent { background-color: #fff3e0; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; background-color: #FFC107; color: white; font-weight: bold; }
        .original-price { text-decoration: line-through; color: #999; font-size: 0.9em; }
        .discounted-price { color: #f44336; font-weight: bold; }
        .discount-badge { background-color: #4CAF50; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.85em; margin-left: 5px; }
        .profit-info { background-color: #e8f5e9; padding: 8px; border-radius: 4px; margin-top: 5px; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>BACK TO THE RETRO</h2>
          <h1>🔔 Nuovo Ordine Ricevuto!</h1>
          <p style="margin: 0; font-size: 14px;">Sistema di notifica automatico</p>
        </div>
        <div class="content">
          <h2>Ordine #${purchase.id}</h2>
          <p><strong>Data:</strong> ${new Date(purchase.created_at).toLocaleString('it-IT')}</p>
          <p><span class="status">Stato: In Attesa</span></p>
          
          <div class="info-box">
            <h3>👤 Informazioni Cliente:</h3>
            <p><strong>Nome:</strong> ${purchase.client_name} ${purchase.client_surname}</p>
            <p><strong>Email:</strong> ${purchase.email}</p>
            <p><strong>Telefono:</strong> ${purchase.phone_number}</p>
          </div>
          
          <div class="info-box">
            <h3>📍 Indirizzi:</h3>
            <p><strong>Fatturazione:</strong><br>
            ${purchase.billing_address}<br>
            ${purchase.billing_postal_code} - ${purchase.billing_city}</p>
            
            <p style="margin-top: 15px;"><strong>Spedizione:</strong><br>
            ${purchase.shipping_address}<br>
            ${purchase.shipping_postal_code} - ${purchase.shipping_city}</p>
          </div>
          
          <div class="info-box">
            <h3>📦 Prodotti Ordinati:</h3>
            ${prodotti.map(p => {
    const originalPrice = parseFloat(p.original_price);
    const discountedPrice = p.discounted_price ? parseFloat(p.discounted_price) : null;
    const finalPrice = discountedPrice ? originalPrice - discountedPrice : originalPrice;
    const hasDiscount = discountedPrice && discountedPrice > 0;
    const discountPercentage = hasDiscount ? Math.round((discountedPrice / originalPrice) * 100) : 0;
    const totalDiscount = hasDiscount ? (discountedPrice * p.quantity) : 0;

    return `
              <div class="product-item">
                <strong>${p.product_name}</strong>
                ${hasDiscount ? `<span class="discount-badge">SCONTO -${discountPercentage}%</span>` : ''}
                <br>
                <small>Piattaforma: ${p.platform_name || 'N/A'} | Categoria: ${p.category_name || 'N/A'}</small><br>
                <div class="price-row">
                  <span>Prezzo: </span>
                  <span>
                    ${hasDiscount
        ? `<span class="original-price">€${originalPrice.toFixed(2)}</span> 
                         <span class="discounted-price">€${finalPrice.toFixed(2)}</span>`
        : `€${originalPrice.toFixed(2)}`
      }
                    × ${p.quantity} = <strong>€${(p.total_price / 100).toFixed(2)}</strong>
                  </span>
                </div>
                ${hasDiscount ? `
                <div class="profit-info">
                  💰 Sconto applicato: €${totalDiscount.toFixed(2)} 
                  (Prezzo pieno sarebbe stato: €${(originalPrice * p.quantity).toFixed(2)})
                </div>
                ` : ''}
              </div>
                `;
  }).join('')}
            
            <div class="price-row" style="margin-top: 15px;">
  <span><strong>Spedizione:</strong> </span>
  <span>
    ${Number(purchase.shipping_price) === 0
      ? " Gratuita"
      : `€${Number(purchase.shipping_price).toFixed(2)}`
    }
  </span>
</div>

            
            <p class="total">TOTALE ORDINE: €${parseFloat(purchase.total_price).toFixed(2)}</p>
          </div>
          
          <div class="urgent">
            <strong>⚠️ AZIONE RICHIESTA:</strong>
            <ul style="margin: 10px 0 0 0;">
              <li>Verifica disponibilità prodotti in magazzino</li>
              <li>Prepara i prodotti per la spedizione</li>
              <li>Aggiorna lo stato dell'ordine nel database</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};