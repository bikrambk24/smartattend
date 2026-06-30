import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorise } from '../middleware/authorise';
import { asyncHandler } from '../utils/asyncHandler';
import { captureFingerprint, getFingerprint } from '../controllers/fingerprint.controller';

const router = Router({ mergeParams: true });

router.use(authenticate, authorise('admin'));

router.post('/', asyncHandler(captureFingerprint));
router.get('/', asyncHandler(getFingerprint));

export default router;