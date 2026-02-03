import express from "express"
import controller from "../Controllers/ProductController";
const router = express.Router();


//INDEX
router.get("/rotta", controller.index)

//SHOW
router.get()

//STORE
router.post()

//UPDATE
router.put()

//MODIFY
router.patch()

//DESTROY
router.delete()

export default router;