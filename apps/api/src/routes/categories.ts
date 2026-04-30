import { Router } from 'express';
import { prisma } from '../prisma.js';
const router = Router();

router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  res.json(categories);
});

export default router;
