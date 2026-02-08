import connection from "../database/databaseConnection.js";
import transporter from "../config/emailConfig.js";
import { confermaOrdineCliente, notificaOrdineAdmin } from "../utils/emailTemplates.js";
import Stripe from 'stripe';

// Inizializza Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ========================================
// FASE 1: Crea Payment Intent Stripe
// ========================================
const createPaymentIntent = async (req, res) => {
    try {
        const { cart, shipping_price } = req.body;

        // Validazione
        if (!cart || cart.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Carrello vuoto'
            });
        }

        // Calcola totale
        const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total_price = (subtotal / 100) + parseFloat(shipping_price || 0);
        const amountInCents = Math.round(total_price * 100);

        console.log(`💳 Creazione Payment Intent per €${total_price.toFixed(2)}`);

        // Crea Payment Intent con Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                cart: JSON.stringify(cart),
                shipping_price: shipping_price
            }
        });

        console.log(`✅ Payment Intent creato: ${paymentIntent.id}`);

        // Restituisci clientSecret al frontend
        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('❌ Errore creazione payment intent:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel creare il pagamento',
            details: error.message
        });
    }
};

// ========================================
// FASE 2: Conferma Ordine DOPO Pagamento
// ========================================
const confirmOrder = async (req, res) => {
    try {
        const {
            paymentIntentId,
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
            cart
        } = req.body;

        console.log(`📦 Conferma ordine per payment: ${paymentIntentId}`);
        console.log('🛒 CART RICEVUTO DAL BACKEND:', JSON.stringify(cart, null, 2));
        console.log('🔍 Primo prodotto nel cart:', cart[0]);
        // Validazione
        if (!client_name || !client_surname || !email || !cart || cart.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Dati ordine incompleti'
            });
        }

        // Verifica che il pagamento sia stato completato con Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                error: 'Pagamento non completato. Stato: ' + paymentIntent.status
            });
        }

        console.log(`✅ Pagamento confermato da Stripe: ${paymentIntent.id}`);

        // Calcola totale
        const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total_price = (subtotal / 100) + parseFloat(shipping_price || 0);

        // 1. Salva ordine nel database
        const insertPurchaseQuery = `
            INSERT INTO purchases (
                client_name, client_surname, email,
                billing_address, billing_postal_code, billing_city,
                shipping_address, shipping_postal_code, shipping_city,
                phone_number, payment_status_id,
                shipping_price, total_price,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const purchaseResult = await new Promise((resolve, reject) => {
            connection.query(
                insertPurchaseQuery,
                [
                    client_name, client_surname, email,
                    billing_address || shipping_address,
                    billing_postal_code || shipping_postal_code,
                    billing_city || shipping_city,
                    shipping_address, shipping_postal_code, shipping_city,
                    phone_number,
                    2, // payment_status_id = 2 (Completato)
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
        console.log(`💾 Ordine salvato nel DB: #${purchaseId}`);

        // 2. Salva prodotti
        const insertProductQuery = `
            INSERT INTO purchase_product (
                purchase_id, product_id, quantity, unit_price, total_price
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

        // 3. Recupera dettagli per email
        const getPurchaseDetailsQuery = `
            SELECT p.id, p.client_name, p.client_surname, p.email,
                   p.billing_address, p.billing_postal_code, p.billing_city,
                   p.shipping_address, p.shipping_postal_code, p.shipping_city,
                   p.phone_number, p.shipping_price, p.total_price, p.created_at
            FROM purchases p WHERE p.id = ?
        `;

        const getProductsQuery = `
            SELECT pp.quantity, pp.unit_price, pp.total_price,
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

        // 4. 📧 INVIA EMAIL AL CLIENTE
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
        }

        // 5. 📧 INVIA EMAIL ALL'ADMIN
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

        // 6. Risposta
        res.status(201).json({
            success: true,
            message: 'Ordine completato con successo! Email inviate.',
            orderId: purchaseId,
            total: total_price
        });

    } catch (error) {
        console.error('❌ Errore conferma ordine:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel confermare l\'ordine',
            details: error.message
        });
    }
};

// ========================================
// VECCHIA FUNZIONE (mantenuta per compatibilità)
// ========================================
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
            cart
        } = req.body;

        if (!client_name || !client_surname || !email || !cart || cart.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Dati ordine incompleti'
            });
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total_price = (subtotal / 100) + parseFloat(shipping_price || 0);

        const insertPurchaseQuery = `
            INSERT INTO purchases (
                client_name, client_surname, email,
                billing_address, billing_postal_code, billing_city,
                shipping_address, shipping_postal_code, shipping_city,
                phone_number, payment_status_id,
                shipping_price, total_price,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const purchaseResult = await new Promise((resolve, reject) => {
            connection.query(
                insertPurchaseQuery,
                [
                    client_name, client_surname, email,
                    billing_address || shipping_address,
                    billing_postal_code || shipping_postal_code,
                    billing_city || shipping_city,
                    shipping_address, shipping_postal_code, shipping_city,
                    phone_number,
                    1,
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

        const insertProductQuery = `
            INSERT INTO purchase_product (
                purchase_id, product_id, quantity, unit_price, total_price
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

        const getPurchaseDetailsQuery = `
            SELECT p.id, p.client_name, p.client_surname, p.email,
                   p.billing_address, p.billing_postal_code, p.billing_city,
                   p.shipping_address, p.shipping_postal_code, p.shipping_city,
                   p.phone_number, p.shipping_price, p.total_price, p.created_at
            FROM purchases p WHERE p.id = ?
        `;

        const getProductsQuery = `
            SELECT pp.quantity, pp.unit_price, pp.total_price,
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
        }

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

        res.status(201).json({
            success: true,
            message: 'Ordine completato con successo!',
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

const getAllOrders = (req, res) => {
    const query = `
        SELECT p.id, p.client_name, p.client_surname, p.email,
               p.total_price, ps.name as payment_status, p.created_at
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

const getOrderDetails = (req, res) => {
    const orderId = req.params.id;

    const purchaseQuery = `
        SELECT p.*, ps.name as payment_status
        FROM purchases p
        INNER JOIN payment_statuses ps ON p.payment_status_id = ps.id
        WHERE p.id = ?
    `;

    const productsQuery = `
        SELECT pp.quantity, pp.unit_price, pp.total_price,
               prod.name as product_name, prod.cover_image,
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
    getOrderDetails,
    createPaymentIntent,
    confirmOrder
};

export default orderController;