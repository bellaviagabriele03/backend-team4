import express from "express";
import orderController from "../Controllers/OrderController.js";

const router = express.Router();

// 💳 STRIPE: Crea payment intent
router.post("/create-payment-intent", orderController.createPaymentIntent);

// ✅ STRIPE: Conferma ordine dopo pagamento (INVIA EMAIL QUI)
router.post("/confirm", orderController.confirmOrder);

// 🔙 Vecchia route (compatibilità)
router.post("/checkout", orderController.createOrder);

// 📋 Admin routes
router.get("/", orderController.getAllOrders);
router.get("/:id", orderController.getOrderDetails);

export default router;