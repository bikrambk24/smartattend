import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import {
  startSession,
  endSession,
  getLiveRoster,
  reviewFlaggedCheckIn,
  getMySchedulesAsTeacher,
} from '../controllers/session.controller';

const router = Router();

router.use(authenticate);

router.get('/my-schedules', authorise('teacher'), asyncHandler(getMySchedulesAsTeacher));
router.post('/:scheduleId/start', authorise('teacher'), asyncHandler(startSession));
router.post('/:scheduleId/end', authorise('teacher'), asyncHandler(endSession));
router.get('/:scheduleId/roster', authorise('teacher', 'admin'), asyncHandler(getLiveRoster));
router.patch('/events/:eventId/review', authorise('teacher'), asyncHandler(reviewFlaggedCheckIn));

export default router;