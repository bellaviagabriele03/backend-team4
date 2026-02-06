import connection from "../database/databaseConnection.js";
import transporter from "../config/emailConfig.js";
import { confermaOrdineCliente, notificaOrdineAdmin } from "../utils/emailTemplates.js";

// Funzione per creare un nuovo ordine completo
const createOrder = async (req, res) => {
    try {
        const {
            client_name,
            client_surname,
            email,
            billing_address,
            billing_postal_code,
            billing_city,
            shipping_address,
            shipping_postal_code,
            shipping_city,
            phone_number,
            shipping_price,
            cart // Array di prodotti nel carrello: [{product_id, quantity, unit_price}]
        } = req.body;

        // Validazione dati
        if (!client_name || !client_surname || !email || !cart || cart.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Dati ordine incompleti'
            });
        }

        // Calcola il totale prodotti
        const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total_price = (subtotal / 100) + parseFloat(shipping_price || 0);

        // 1. Inserisci il purchase nella tabella purchases
        const insertPurchaseQuery = `
            INSERT INTO purchases (
                client_name, 
                client_surname, 
                email,
                billing_address,
                billing_postal_code,
                billing_city,
                shipping_address,
                shipping_postal_code,
                shipping_city,
                phone_number,
                payment_status_id,
                shipping_price,
                total_price,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const purchaseResult = await new Promise((resolve, reject) => {
            connection.query(
                insertPurchaseQuery,
                [
                    client_name,
                    client_surname,
                    email,
                    billing_address || shipping_address,
                    billing_postal_code || shipping_postal_code,
                    billing_city || shipping_city,
                    shipping_address,
                    shipping_postal_code,
                    shipping_city,
                    phone_number,
                    1, // payment_status_id = 1 (In attesa)
                    shipping_price || 0,
                    total_price
                ],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });

        const purchaseId = purchaseResult.insertId;

        // 2. Inserisci i prodotti nella tabella purchase_product
        const insertProductQuery = `
  INSERT INTO purchase_product (
    purchase_id,
    product_id,
    quantity,
    unit_price,
    total_price
  ) VALUES (?, ?, ?, ?, ?)
`;

        for (const item of cart) {
            const itemTotal = item.quantity * item.unit_price;
            await new Promise((resolve, reject) => {
                connection.query(
                    insertProductQuery,
                    [purchaseId, item.product_id, item.quantity, item.unit_price, itemTotal],
                    (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    }
                );
            });
        }

        // 3. Recupera i dettagli completi dell'ordine per le email
        const getPurchaseDetailsQuery = `
            SELECT 
                p.id,
                p.client_name,
                p.client_surname,
                p.email,
                p.billing_address,
                p.billing_postal_code,
                p.billing_city,
                p.shipping_address,
                p.shipping_postal_code,
                p.shipping_city,
                p.phone_number,
                p.shipping_price,
                p.total_price,
                p.created_at
            FROM purchases p
            WHERE p.id = ?
        `;

        const getProductsQuery = `
            SELECT 
                pp.quantity,
                pp.unit_price,
                pp.total_price,
                prod.name as product_name,
                plat.name as platform_name,
                cat.name as category_name
            FROM purchase_product pp
            INNER JOIN products prod ON pp.product_id = prod.id
            LEFT JOIN platforms plat ON prod.platform_id = plat.id
            LEFT JOIN categories cat ON prod.category_id = cat.id
            WHERE pp.purchase_id = ?
        `;

        const purchaseDetails = await new Promise((resolve, reject) => {
            connection.query(getPurchaseDetailsQuery, [purchaseId], (err, result) => {
                if (err) reject(err);
                else resolve(result[0]);
            });
        });

        const prodottiDettagli = await new Promise((resolve, reject) => {
            connection.query(getProductsQuery, [purchaseId], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // 4. Invia email al cliente
        try {
            await transporter.sendMail({
                from: `"Back to the Retro Shop" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `✅ Conferma Ordine #${purchaseId}`,
                html: confermaOrdineCliente(purchaseDetails, prodottiDettagli)
            });
            console.log(`✅ Email inviata al cliente: ${email}`);
        } catch (emailError) {
            console.error('⚠️ Errore invio email cliente:', emailError);
            // Non blocchiamo l'ordine se l'email fallisce
        }

        // 5. Invia email all'admin
        try {
            await transporter.sendMail({
                from: `"Sistema Ordini" <${process.env.EMAIL_USER}>`,
                to: process.env.ADMIN_EMAIL,
                subject: `🔔 Nuovo Ordine #${purchaseId} - ${client_name} ${client_surname}`,
                html: notificaOrdineAdmin(purchaseDetails, prodottiDettagli)
            });
            console.log(`✅ Email inviata all'admin: ${process.env.ADMIN_EMAIL}`);
        } catch (emailError) {
            console.error('⚠️ Errore invio email admin:', emailError);
        }

        // 6. Risposta di successo
        res.status(201).json({
            success: true,
            message: 'Ordine completato con successo! Controlla la tua email per la conferma.',
            orderId: purchaseId,
            total: total_price
        });

    } catch (error) {
        console.error('Errore durante la creazione dell\'ordine:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel processare l\'ordine',
            details: error.message
        });
    }
};

// Funzione per ottenere tutti gli ordini (per admin)
const getAllOrders = (req, res) => {
    const query = `
        SELECT 
            p.id,
            p.client_name,
            p.client_surname,
            p.email,
            p.total_price,
            ps.name as payment_status,
            p.created_at
        FROM purchases p
        INNER JOIN payment_statuses ps ON p.payment_status_id = ps.id
        ORDER BY p.created_at DESC
    `;

    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
        res.json({
            success: true,
            count: results.length,
            orders: results
        });
    });
};

// Funzione per ottenere dettagli di un singolo ordine
const getOrderDetails = (req, res) => {
    const orderId = req.params.id;

    const purchaseQuery = `
        SELECT 
            p.*,
            ps.name as payment_status
        FROM purchases p
        INNER JOIN payment_statuses ps ON p.payment_status_id = ps.id
        WHERE p.id = ?
    `;

    const productsQuery = `
        SELECT 
            pp.quantity,
            pp.unit_price,
            pp.total_price,
            prod.name as product_name,
            prod.cover_image,
            plat.name as platform_name,
            cat.name as category_name
        FROM purchase_product pp
        INNER JOIN products prod ON pp.product_id = prod.id
        LEFT JOIN platforms plat ON prod.platform_id = plat.id
        LEFT JOIN categories cat ON prod.category_id = cat.id
        WHERE pp.purchase_id = ?
    `;

    connection.query(purchaseQuery, [orderId], (err, purchaseResult) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        if (purchaseResult.length === 0) {
            return res.status(404).json({ success: false, error: 'Ordine non trovato' });
        }

        connection.query(productsQuery, [orderId], (err2, productsResult) => {
            if (err2) {
                return res.status(500).json({ success: false, error: err2.message });
            }

            res.json({
                success: true,
                order: purchaseResult[0],
                products: productsResult
            });
        });
    });
};

const orderController = {
    createOrder,
    getAllOrders,
    getOrderDetails
};

export default orderController;