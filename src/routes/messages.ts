import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  getMessageStats
} from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/send', sendMessage);
router.get('/', getMessages);
router.get('/stats', getMessageStats);

export default router;