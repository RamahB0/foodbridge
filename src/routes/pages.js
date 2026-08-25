import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const pagesRouter = Router();

pagesRouter.get('/', (req, res) => {
  res.render('index', { title: 'FoodBridge — rescue surplus food, feed your neighbors' });
});

// A single dashboard route serves both roles, since the data each needs is
// entirely different: donors see the listings they posted, recipients see
// the claims they have made.
pagesRouter.get('/dashboard', requireAuth, async (req, res) => {
  const { userId, role } = req.session;

  if (role === 'DONOR') {
    const listings = await prisma.listing.findMany({
      where: { donorId: userId },
      include: { claims: { include: { recipient: { select: { orgName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.render('dashboard', { title: 'Your listings', role, listings, claims: null });
  }

  const claims = await prisma.claim.findMany({
    where: { recipientId: userId },
    include: { listing: { include: { donor: { select: { orgName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.render('dashboard', { title: 'Your claims', role, listings: null, claims });
});
