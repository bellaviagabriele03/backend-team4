
import express from "express"
import router from "./Routers/Products.js";
import productController from "./Controllers/ProductController.js";
import orderRouter from "./Routers/Orders.js";
import cors from "cors"
import routeNotFound from "./MiddleWares/routeNotFound.js";
import connection from "./database/databaseConnection.js";

const app = express();
const port = process.env.SERVER_PORT;
const portFrontend = process.env.FRONTEND_PORT;
app.use(cors({
    origin: `http://localhost:${portFrontend}`
}))


app.use(express.json())

app.use('/images', express.static('public/images'))

app.use("/retro/api/products", router)
app.use("/retro/api/orders", orderRouter)

app.get("/retro/api/platforms", (req, res) => {
    const sql = `
    SELECT DISTINCT platforms.name 
    FROM products
    INNER JOIN platforms ON products.platform_id = platforms.id
    ORDER BY platforms.name ASC
  `;

    connection.query(sql, (err, rows) => {
        if (err) {
            console.error("PLATFORMS QUERY ERROR:", err);
            return res.status(500).json({ success: false, error: err.message });
        }

        res.json({
            success: true,
            results: rows
        });
    });
});






app.use(routeNotFound)

app.listen(port, (err) => {
    if (err) throw err

    console.log(`il server è in ascolto nella porta: ${port}`)
})