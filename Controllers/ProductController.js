import connection from "../database/databaseConnection.js"


//INDEX
function index(req, res) {
    const categories = req.query.categories

    if (categories === "") {
        const query = "SELECT * FROM `products`"
        connection.query(query, (err, result) => {
            if (err) {
                res.status(500)
                return res.json({
                    message: "internal server error"
                })
            }
            res.json({
                results: result
            })
        })
    } else {
        const query = "SELECT * FROM `products` INNER JOIN `categories` ON products.category_id = categories.id WHERE categories.name = ?"
        connection.query(query, [categories], (err, result)=>{
            if(err) {
                res.status(500);
                return res.json({
                    message: "internal server error"
                })
            }
            res.json({
                info: {
                    categoria: categories,
                    count: result
                },
                result: result
            })

        })
    }


}


//SHOW
function show(req, res) {
    const slug = req.params.slug
    const query = "SELECT * FROM `products` WHERE `products`.slug = ? "
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
            const gioco = result[0];
            res.json(gioco)
        }
    })

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
function modify() {

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

const controller = {
    index,
    show,
    store,
    update,
    modify,
    destroy,
}

export default controller