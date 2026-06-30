import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import { checkIn, checkOut } from '../controllers/attendance.controller';

const router = Router();

router.use(authenticate, authorise('student'));

router.post('/checkin', asyncHandler(checkIn));
router.post('/checkout', asyncHandler(checkOut));

export default router;