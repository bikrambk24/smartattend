import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import { listStudents, getStudentProfile } from '../controllers/student.controller';

const router = Router();

router.use(authenticate, authorise('teacher', 'admin'));

router.get('/', asyncHandler(listStudents));
router.get('/:id', asyncHandler(getStudentProfile));

export default router;