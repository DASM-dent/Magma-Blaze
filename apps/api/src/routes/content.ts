import { Router } from 'express';
import { prisma } from '../prisma.js';
const router = Router();
router.get('/', async (req, res) => {
  const area = String(req.query.area || '');
  const blocks = await prisma.contentBlock.findMany({ where: { isActive:true, ...(area ? { area } : {}) }, orderBy:[{ area:'asc' }, { sortOrder:'asc' }] });
  res.json(blocks);
});
export default router;
