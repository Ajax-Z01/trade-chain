import { Router } from 'express';
import { createActivity, getActivities, getActivityByAccountController } from '../controllers/activityController.js';

const router = Router();

/**
 * Tambah activity log
 * POST /activity
 */
router.post('/', createActivity);

/**
 * Ambil semua activity log
 * GET /activity?account=0x123&txHash=0xabc
 */
router.get('/', getActivities);

/**
 * Ambil activity log per account
 * GET /activity/:account
 */
router.get('/:account', getActivityByAccountController);

export default router;
