import { Router } from 'express'
import {
  addAggregatedActivity,
  getAggregatedActivityById,
  getAggregatedActivities,
  addAggregatedTag,
  removeAggregatedTag,
} from '../controllers/aggregatedActivityController.js'

const router = Router()

/**
 * @route POST /aggregated
 * @desc Tambah aggregated activity log
 */
router.post('/', addAggregatedActivity)

/**
 * @route GET /aggregated/:id
 * @desc Ambil aggregated activity log by ID
 */
router.get('/:id', getAggregatedActivityById)

/**
 * @route GET /aggregated
 * @desc Ambil semua aggregated activity log, dengan filter & pagination
 * query params: account, txHash, contractAddress, tags, limit, startAfterTimestamp
 */
router.get('/', getAggregatedActivities)

/**
 * @route POST /aggregated/:id/tag
 * @desc Tambah tag ke aggregated log
 * body: { tag: string }
 */
router.post('/:id/tag', addAggregatedTag)

/**
 * @route DELETE /aggregated/:id/tag
 * @desc Hapus tag dari aggregated log
 * query: ?tag=someTag
 */
router.delete('/:id/tag', removeAggregatedTag)

export default router
