import express from "express"
import router from "./Routers/Products.js";
import cors from "cors"

const app = express();
const port = process.env.SERVER_PORT;
const portFrontend = process.env.FRONTEND_PORT;
app.use(cors({
    origin: `http://localhost:${portFrontend}`
}))


app.use(express.json())

app.use("/retro/api/products", router)






app.listen(port, (err) => {
    if (err) throw err

    console.log(`il server è in ascolto nella porta: ${port}`)
})