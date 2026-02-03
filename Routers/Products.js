import express from "express"
import controller from "../Controllers/ProductController.js";


const router = express.Router();


//INDEX
router.get("/", controller.index)

 //SHOW
  router.get("/:slug",controller.show)

// //STORE
router.post("/", controller.store)

 //UPDATE
// router.put()

// //MODIFY
// router.patch()

// //DESTROY
router.delete("/:id", controller.destroy)

export default router;