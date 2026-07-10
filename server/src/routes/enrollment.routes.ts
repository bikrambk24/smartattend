import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import { listEnrollments, createEnrollment, deleteEnrollment } from '../controllers/enrollment.controller';

const router = Router();

router.use(authenticate, authorise('admin'));

router.get('/', asyncHandler(listEnrollments));
router.post('/', asyncHandler(createEnrollment));
router.delete('/:id', asyncHandler(deleteEnrollment));

export default router;