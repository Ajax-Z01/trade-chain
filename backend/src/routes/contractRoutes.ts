import { Router } from 'express';
import {
  fetchDeployedContracts,
  logContractAction,
  getContractDetails,
  getContractStep,
} from '../controllers/contractController.js';

const router = Router();

router.get('/', fetchDeployedContracts);

router.post('/log', logContractAction);

router.get('/:address/details', getContractDetails);

router.get('/:address/step', getContractStep);

export default router;
