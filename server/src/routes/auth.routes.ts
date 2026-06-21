import { Router } from 'express';
import { createUser, login } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';

const router = Router();

router.post('/login', login);

// Only logged-in admins can create new users
router.post('/users', authenticate, authorise('admin'), createUser);

export default router;