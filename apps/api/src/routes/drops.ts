import { Router } from 'express';
import { prisma } from '../prisma.js';
const router = Router();

function mapDrop(drop: any) {
  if (!drop) return null;
  return {
    ...drop,
    name: drop.title,
    slug: drop.id,
    bannerImage: null,
  };
}

router.get('/active', async (_req, res) => {
  const drop = await prisma.drop.findFirst({ where: { isActive: true }, orderBy: { startsAt: 'asc' }});
  const settings = await prisma.siteSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  res.json({ drop: mapDrop(drop), maintenance: map.storeMode === 'MAINTENANCE' || map.maintenance === 'true' });
});

router.get('/site-state', async (_req, res) => {
  const settings = await prisma.siteSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const storeMode = map.storeMode || (map.maintenance === 'true' ? 'MAINTENANCE' : 'SHOP');
  const publicSettings = {
    showModels: map.showModels !== 'false',
    showDrops: map.showDrops !== 'false',
    showNews: map.showNews !== 'false',
    showCategories: map.showCategories !== 'false',
    showFeatured: map.showFeatured !== 'false',
    showFooter: map.showFooter !== 'false',
  };

  if (storeMode === 'MAINTENANCE') {
    return res.json({ mode: 'MAINTENANCE', message: 'Estamos preparando una mejor experiencia. Volvemos pronto.', publicSettings });
  }

  if (storeMode === 'DROP') {
    const drop = await prisma.drop.findFirst({ where: { isActive: true }, orderBy: { startsAt: 'asc' }});
    if (!drop) {
      return res.json({
        mode: 'NO_DROP',
        publicSettings,
        message: 'Nuestro próximo drop aún no está establecido. Prepárate: pronto abriremos una nueva edición limitada.',
      });
    }
    return res.json({ mode: 'DROP_LOCKED', publicSettings, drop: mapDrop(drop) });
  }

  res.json({ mode: 'OPEN', publicSettings });
});

router.get('/active/models', async (_req, res) => {
  const settings = await prisma.siteSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  if (map.storeMode !== 'DROP' || map.showModels !== 'true') return res.json({ drop:null, photos:[] });

  const drop = await prisma.drop.findFirst({ where:{ isActive:true }, orderBy:{ startsAt:'asc' }});
  if (!drop) return res.json({ drop:null, photos:[] });
  const photos = await prisma.modelPhoto.findMany({ where:{ dropId:drop.id, isActive:true }, orderBy:[{ sortOrder:'asc' }, { createdAt:'desc' }], include:{ product:true }});
  res.json({ drop: mapDrop(drop), photos: photos.map((m:any)=>({ id:m.id, imageUrl:m.imageUrl, caption:m.caption, tagX:m.tagX, tagY:m.tagY, product:{ id:m.product.id, name:m.product.name, slug:m.product.slug, price:Math.round(m.product.price/100), imageUrl:m.product.imageUrl }})) });
});

router.post('/notify', async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!email.includes('@')) return res.status(400).json({ message: 'Correo inválido' });
  await prisma.notification.create({ data: { title: 'Nuevo interesado en drop', body: `${email} pidió notificación para un drop.` }});
  res.json({ ok: true });
});

export default router;
