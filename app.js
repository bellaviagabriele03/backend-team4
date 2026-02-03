import express from "express"
import router from "./Routers/Products.js";

const app = express();
const port = process.env.SERVER_PORT;
app.use(express.json())
app.use("/retro/api/products", router)


app.get("/",(req,res)=>{
    res.send("where memories respawn")
})               


app.listen(port, (err)=>{
    if(err) throw err
    
    console.log(`il server è in ascolto nella porta: ${port}`)
})