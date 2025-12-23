import { Router } from 'express';
import {
  createContact,
  importContacts,
  getContacts,
  updateContact,
  deleteContact
} from '../controllers/contactController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', createContact);
router.post('/import', importContacts);
router.get('/', getContacts);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;