import connection from "../database/databaseConnection.js"


//INDEX
function index() {
    console.log("funzione index")
}
//SHOW
function show() {

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


//UPDATE
function update() {

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