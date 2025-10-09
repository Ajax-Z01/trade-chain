import { Router } from 'express';
import {
  fetchDeployedContracts,
  logContractAction,
  getContractDetails,
  getContractStep,
  getUserContracts,
} from '../controllers/contractController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js"

const router = Router();

router.get('/', authMiddleware, fetchDeployedContracts);

router.post('/log', authMiddleware, logContractAction);

router.get('/:address/details', authMiddleware, getContractDetails);

router.get('/my', authMiddleware, getUserContracts);

router.get('/:address/step', authMiddleware, getContractStep);

export default router;
