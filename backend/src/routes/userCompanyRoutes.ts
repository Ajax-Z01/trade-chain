import { Router } from "express"
import { UserCompanyController } from "../controllers/userCompanyController.js"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { adminMiddleware } from "../middlewares/adminMiddleware.js"

const router = Router()

// --- Create ---
router.post("/", authMiddleware, UserCompanyController.create)

// --- Get All ---
router.get("/", UserCompanyController.getAll)

// --- Get by User ---
router.get("/user/:address", authMiddleware, UserCompanyController.getByUser)

// --- Get by Company ---
router.get("/company/:companyId", authMiddleware, UserCompanyController.getByCompany)

// --- Get by ID ---
router.get("/:id", authMiddleware, UserCompanyController.getById)

// --- Update ---
router.put("/:id", authMiddleware, UserCompanyController.update)

// --- Delete ---
router.delete("/:id", authMiddleware, UserCompanyController.delete)

export default router
