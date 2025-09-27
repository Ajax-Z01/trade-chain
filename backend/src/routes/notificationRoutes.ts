import { Router } from "express"
import { NotificationController } from "../controllers/notificationController.js"

const router = Router()

// --- Get All Notifications ---
router.get("/", NotificationController.getAll)

// --- Get Notifications by User ---
router.get("/user/:userId", NotificationController.getByUser)

// --- Get Notification by Id ---
router.get("/:id", NotificationController.getById)

// --- Mark Notification as Read ---
router.patch("/:id/read", NotificationController.markAsRead)

// --- Delete Notification ---
router.delete("/:id", NotificationController.delete)

export default router
