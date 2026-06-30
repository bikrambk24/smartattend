import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createClass,
  listClasses,
  getClass,
  updateClass,
  deleteClass,
} from '../controllers/class.controller';

const router = Router();

router.use(authenticate, authorise('admin'));

router.post('/', asyncHandler(createClass));
router.get('/', asyncHandler(listClasses));
router.get('/:id', asyncHandler(getClass));
router.patch('/:id', asyncHandler(updateClass));
router.delete('/:id', asyncHandler(deleteClass));

export default router;