import connection from "../database/databaseConnection.js"


//INDEX
function index(req, res) {
    const categories = req.query.categories


    if (categories === undefined) {

        const query = "SELECT products.name, products.slug, products.cover_image, platforms.name as platforms, categories.name as category, products.description, products.price, states.name as state, states.description as state_description, products.conditions_description, products.discounted_price, products.stock, products.production_year FROM `products` INNER JOIN `platforms` ON products.platform_id = platforms.id INNER JOIN `categories` ON products.category_id = categories.id INNER JOIN `states` ON products.state_id = states.id"
        connection.query(query, (err, result) => {
            if (err) {
                res.status(500)
                return res.json({
                    message: "internal server error"
                })
            }
            res.json({
                info: {
                    count: result.length,
                },
                results: result
            })
        })
    } else {
        const query = "SELECT products.name, products.slug, products.description, products.cover_image, products.price, products.conditions_description, products.discounted_price, products.stock, products.production_year, platforms.name as platform  FROM `products` INNER JOIN `categories` ON products.category_id = categories.id INNER JOIN `platforms` ON products.platform_id = platforms.id INNER JOIN `states` ON products.state_id = states.id WHERE categories.name = ?"
        connection.query(query, [categories], (err, result) => {
            if (err) {
                res.status(500);
                return res.json({
                    message: "internal server error"
                })
            }
            res.json({
                info: {
                    category: categories,
                    count: result.length
                },
                results: result
            })

        })
    }


}


//SHOW
function show(req, res) {
    const slug = req.params.slug
    const query = "SELECT products.name, products.slug, products.description, products.cover_image, products.price, products.conditions_description, products.discounted_price, products.stock, products.production_year, platforms.name as platform, platforms.brand as brand, categories.name as category, states.name as state, states.description as state_description  FROM `products` INNER JOIN `categories` ON products.category_id = categories.id INNER JOIN `platforms` ON products.platform_id = platforms.id INNER JOIN `states` ON products.state_id = states.id WHERE products.slug = ?"

    //query per prelevare il singolo prodotto 
    connection.query(query, [slug], (err, result) => {
        if (err) {
            res.status(500);
            return res.json({
                message: "internal server error"
            })
        }
        if (result.length === 0) {
            res.status(404);
            res.json({
                message: "gioco non trovato"
            })
        } else {
            const gioco = result;

            console.log(gioco);


            res.json({
                results: gioco,

            })
        }

    })


    //

}
//STORE
const store = (req, res) => {
    const {
        name,
        slug,
        platform_id,
        category_id,
        description,
        price,
        state_id,
        conditions_description,
        stock,
        production_year,
        cover_image,
        discounted_price
    } = req.body;


   

    if (!name || !slug || !platform_id || !category_id || !price || !state_id || stock == null) {
        return res.status(400).json({
            success: false,
            error: 'name, slug, platform_id, category_id, price, state_id e stock sono obbligatori'
        });
    }

    connection.query(
        `INSERT INTO products (
            name, slug, cover_image, platform_id, category_id, 
            description, price, state_id, conditions_description, 
            discounted_price, stock, production_year, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
            name,
            slug,
            cover_image || '',
            platform_id,
            category_id,
            description || null,
            price,
            state_id,
            conditions_description || null,
            discounted_price || null,
            stock,
            production_year || null
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            const nuovoId = result.insertId;

            connection.query(
                'SELECT * FROM products WHERE id = ?',
                [nuovoId],
                (err2, results) => {
                    if (err2) {
                        return res.status(500).json({ success: false, error: err2.message });
                    }
                    res.status(201).json({ success: true, data: results[0] });
                }
            );
        }
    );
};


function update(req, res) {
    console.log('METHOD:', req.method);
    console.log('URL:', req.url);
    console.log('HEADERS content-type:', req.headers['content-type']);
    console.log('BODY RAW:', req.body);

    const slug = req.params.slug;

    const {
        name,
        cover_image,
        platform_id,
        category_id,
        description,
        price,
        state_id,
        conditions_description,
        discounted_price,
        stock,
        production_year,
    } = req.body;

    const query = `
    UPDATE products
    SET
      name                    = ?,
      cover_image             = ?,
      platform_id             = ?,
      category_id             = ?,
      description             = ?,
      price                   = ?,
      state_id                = ?,
      conditions_description  = ?,
      discounted_price        = ?,
      stock                   = ?,
      production_year         = ?,
      updated_at              = NOW()
    WHERE slug = ?
  `;
    const params = [
        name,
        cover_image,
        platform_id,
        category_id,
        description,
        price,
        state_id,
        conditions_description,
        discounted_price,
        stock,
        production_year,
        slug,
    ];
    connection.query(query, params, (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Prodotto non trovato"
            });
        }

        connection.query(
            'SELECT * FROM products WHERE slug = ?',
            [slug],
            (err2, results) => {
                if (err2) {
                    return res.status(500).json({ success: false, error: err2.message });
                }
                res.status(200).json({ success: true, data: results[0] });
            }
        );
    });
}



//MODIFY
function modify(req, res) {
    const slug = req.params.slug;

    const campiModificabili = [
        'description',
        'price',
        'discounted_price',
        'stock'
    ];

    const aggiornamenti = [];
    const parametri = [];

    campiModificabili.forEach(campo => {
        if (req.body.hasOwnProperty(campo)) {
            aggiornamenti.push(`${campo} = ?`);
            parametri.push(req.body[campo]);
        }
    });

    if (aggiornamenti.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Nessun campo da aggiornare. Campi modificabili: description, price, discounted_price, stock'
        });
    }

    aggiornamenti.push('updated_at = NOW()');

    parametri.push(slug);

    const query = `UPDATE products SET ${aggiornamenti.join(', ')} WHERE slug = ?`;

    connection.query(query, parametri, (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Prodotto non trovato'
            });
        }


        connection.query(
            'SELECT * FROM products WHERE slug = ?',
            [slug],
            (err2, results) => {
                if (err2) {
                    return res.status(500).json({
                        success: false,
                        error: err2.message
                    });
                }
                res.status(200).json({
                    success: true,
                    data: results[0]
                });
            }
        );
    });
}
//DESTROY
const destroy = (req, res) => {
    connection.query('DELETE FROM products WHERE id = ?', [req.params.id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Prodotto non trovato' });
        }
        res.status(200).json({ success: true, message: 'Prodotto eliminato' });
    });
};


// LA SCRIVO QUI MA SARA' DA SPOSTARE IN UN SUO CONTROLLER

function storePurchase(req, res) {
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
        payment_status_id,
        shipping_price, // da capire
        products // array: [{ product_id, quantity }]
    } = req.body;

    ////////////////// VALIDAZIONE
    if (
        !client_name || !client_surname || !email ||
        !billing_address || !billing_postal_code || !billing_city ||
        !shipping_address || !shipping_postal_code || !shipping_city ||
        !phone_number || !payment_status_id ||
        !Array.isArray(products) || products.length === 0
    ) {
        return res.status(400).json({
            success: false,
            error: "tutti i campi sono necessari" // FIXME: ERRORE DA RISCRIVERE
        });
    }
    const productIds = products.map(p => p.product_id);
    const priceQuery = `
        SELECT id, price, discounted_price 
        FROM products 
        WHERE id IN (?)
    `;
    connection.query(priceQuery, [productIds], (err, priceRows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        if (priceRows.length !== products.length) {
            return res.status(400).json({
                success: false,
                error: "ID prodotti non validi"
            });
        }
        let totalProductsPrice = 0;
        const fullDataProducts = products.map(p => {
            const dbProduct = priceRows.find(r => r.id === p.product_id);
            const unitPrice = dbProduct.discounted_price || dbProduct.price;
            const totalPrice = unitPrice * p.quantity;
            totalProductsPrice += totalPrice;
            return {
                ...p,
                unit_price: unitPrice,
                total_price: totalPrice
            };
        });
        const finalTotal = totalProductsPrice + (shipping_price || 0);
        const purchaseQuery = `
            INSERT INTO purchases (
                client_name, client_surname, email,
                billing_address, billing_postal_code, billing_city,
                shipping_address, shipping_postal_code, shipping_city,
                phone_number, payment_status_id,
                shipping_price, total_price,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        const purchaseParams = [
            client_name, client_surname, email,
            billing_address, billing_postal_code, billing_city,
            shipping_address, shipping_postal_code, shipping_city,
            phone_number, payment_status_id,
            shipping_price || 0, finalTotal
        ];
        connection.query(purchaseQuery, purchaseParams, (err, purchaseResult) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            const purchaseId = purchaseResult.insertId;
            const purchaseProductValues = fullDataProducts.map(p => [
                purchaseId,
                p.product_id,
                p.quantity,
                p.unit_price,
                p.total_price
            ]);
            const purchaseProductQuery = `
                INSERT INTO purchase_product 
                (purchase_id, product_id, quantity, unit_price, total_price)
                VALUES ?
            `;
            connection.query(purchaseProductQuery, [purchaseProductValues], (err) => {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }
                res.status(201).json({
                    success: true,
                    data: {
                        purchase_id: purchaseId,
                        total_price: finalTotal,
                        shipping_price,
                        products: fullDataProducts
                    }
                });
            });
        });
    });
}

// CREATE PURCHASE INPUT EXAMPLE: 
// {
//   "client_name": "Mario",
//   "client_surname": "Rossi",
//   "email": "mario.rossi@example.com",

//   "billing_address": "Via Roma 12",
//   "billing_postal_code": "20100",
//   "billing_city": "Milano",

//   "shipping_address": "Via Milano 45",
//   "shipping_postal_code": "20100",
//   "shipping_city": "Milano",

//   "phone_number": "+39 333 1234567",

//   "payment_status_id": 1,
//   "shipping_price": 5.90,

//   "products": [
//     {
//       "product_id": 102,
//       "quantity": 1
//     },
//     {
//       "product_id": 103,
//       "quantity": 2
//     }
//   ]
// }



const controller = {
    index,
    show,
    store,
    update,
    modify,
    destroy,
    storePurchase
}

export default controller