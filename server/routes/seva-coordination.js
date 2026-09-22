import express from 'express';
import { coordinationResponse, SEVA_COORDINATION_ID } from '../seva-coordination.js';

export function createSevaCoordinationRouter({ requirePst, connectStore, Settings }) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  router.use(requirePst);
  router.get('/', async (req, res) => {
    try {
      await connectStore();
      const settings = await Settings.findById(SEVA_COORDINATION_ID).lean();
      return res.json(coordinationResponse(settings));
    } catch {
      return res.status(503).json({ ok: false, error: 'Unable to load booking contact setup. Please try again.' });
    }
  });
  return router;
}
