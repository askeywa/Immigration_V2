import { Router } from 'express';
import ExpressEntryDraw from '../models/ExpressEntryDraw';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { okResponse, createdResponse, badRequestResponse } from '../utils/response';

const router = Router();

// Public: get latest draw info
router.get('/', async (_req: any, res: any) => {
  const doc = await ExpressEntryDraw.findOne().lean();
  return okResponse(res, 'Latest draw', doc || null);
});

// Admin: upsert draw info
router.put('/', authenticate, authorize('admin'), async (req: AuthRequest, res) => {
  const { score, date, notes } = req.body || {};
  if (typeof score !== 'number' || !date) {
    return badRequestResponse(res, 'score (number) and date (ISO string) are required');
  }
  const payload = { score, date, notes, updatedBy: req.user?._id?.toString() } as Record<string, unknown>;
  const doc = await ExpressEntryDraw.findOneAndUpdate({}, payload, { new: true, upsert: true, setDefaultsOnInsert: true });
  return createdResponse(res, 'Draw updated', doc.toObject());
});

export default router;


