import express from "express";
import orderController from "../Controllers/OrderController.js";

const router = express.Router();

// Rotta per creare un nuovo ordine e inviare email
router.post("/checkout", orderController.createOrder);

// Rotta per ottenere tutti gli ordini (admin)
router.get("/", orderController.getAllOrders);

// Rotta per ottenere dettagli di un ordine specifico
router.get("/:id", orderController.getOrderDetails);

export default router;