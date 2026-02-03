import connection from "../database/databaseConnection.js"


//INDEX
function index (req,res){
    const query= "SELECT * FROM `products`"
    connection.query(query,(err,result)=>{
    if(err){
        res.status(500)
        return res.json({
            message:"internal server error"
        })
    }
    res.json({
        results:result
    })
    })
}
//SHOW
function show(req,res) {
    const slug= req.params.slug
    const query = "SELECT * FROM `products` WHERE `products`.slug = ? "
    connection.query(query,[slug],(err,result)=>{
        if(err){
            res.status(500);
            return res.json({
                message:"internal server error"
            })
        }
        if(result.length === 0 ){
            res.status(404);
            res.json({
                message:"gioco non trovato"
            })
        }else{
            const gioco = result[0];
            res.json(gioco)
        }
    })

}
//STORE
function store() {

}
//UPDATE
function update() {

}
//MODIFY
function modify() {

}
//DESTROY
function destroy() {

}

const controller = {
    index,
    show,
    store,
    update,
    modify,
    destroy,
}

export default controller