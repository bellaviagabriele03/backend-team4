export default function routeNotFound (req, res, next) {
    res.status(404)
    res.json({
        err: 404,
        message: "Nessuna rotta trovata, controllare bene l'indirizzo"
    })
}