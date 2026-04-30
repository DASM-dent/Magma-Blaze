import { Router } from 'express';
import { prisma } from '../prisma.js';
const router = Router();

router.get('/', async (_req, res) => {
  const posts = await prisma.newsPost.findMany({ where:{ isPublished:true }, orderBy:{ createdAt:'desc' } });
  res.json(posts);
});

router.get('/:slug', async (req, res) => {
  const post = await prisma.newsPost.findUnique({ where:{ slug:req.params.slug } });
  if (!post || !post.isPublished) return res.status(404).json({ message:'Novedad no encontrada' });
  res.json(post);
});

export default router;
