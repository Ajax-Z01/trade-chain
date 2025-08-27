import { Router } from 'express';
import {
  fetchDeployedContracts,
  logContractAction,
  getContractDetails,
} from '../controllers/contractController.js';

const router = Router();

router.get('/', fetchDeployedContracts);

router.post('/log', logContractAction);

router.get('/:address/details', getContractDetails);

export default router;
