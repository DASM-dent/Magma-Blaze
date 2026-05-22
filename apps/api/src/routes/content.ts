import { Router } from 'express';
import { prisma } from '../prisma.js';
const router = Router();

router.get('/popups/active', async (_req, res) => {
  const now = new Date();
  const popup = await prisma.marketingPopup.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(popup);
});

router.get('/', async (req, res) => {
  const area = String(req.query.area || '');
  const blocks = await prisma.contentBlock.findMany({ where: { isActive:true, ...(area ? { area } : {}) }, orderBy:[{ area:'asc' }, { sortOrder:'asc' }] });
  res.json(blocks);
});
export default router;
