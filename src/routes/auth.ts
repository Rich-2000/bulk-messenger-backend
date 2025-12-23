import { Router, Request } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile
} from '../controllers/authController';
import { authenticate, generateToken } from '../middleware/auth';
import passport from '../config/passport';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req: Request, res) => {
    // User is attached by passport
    if (req.user) {
      const token = generateToken((req.user as any)._id.toString());
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/auth/error`);
    }
  }
);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;