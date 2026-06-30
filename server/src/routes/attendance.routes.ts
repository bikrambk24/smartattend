import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import { checkIn, checkOut, getMySchedules } from '../controllers/attendance.controller';

const router = Router();

router.use(authenticate, authorise('student'));

router.get('/my-schedules', asyncHandler(getMySchedules));
router.post('/checkin', asyncHandler(checkIn));
router.post('/checkout', asyncHandler(checkOut));

export default router;