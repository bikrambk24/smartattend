import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/schedule.controller';

const router = Router();

router.use(authenticate, authorise('admin'));

router.post('/', asyncHandler(createSchedule));
router.get('/', asyncHandler(listSchedules));
router.get('/:id', asyncHandler(getSchedule));
router.patch('/:id', asyncHandler(updateSchedule));
router.delete('/:id', asyncHandler(deleteSchedule));

export default router;