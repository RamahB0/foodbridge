import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { canClaimListing, canTransitionClaim } from '../lib/listingRules.js';
import { requireRole } from '../middleware/auth.js';

export const claimsRouter = Router();

// A recipient org claims an AVAILABLE listing. Creating the claim also moves
// the listing to CLAIMED so it drops out of the public browse list.
claimsRouter.post('/listings/:id/claim', requireRole('RECIPIENT'), async (req, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });

  if (!listing) {
    return res.status(404).render('error', { title: 'Not found', message: 'That listing does not exist.' });
  }

  if (!canClaimListing(listing, req.session.userId)) {
    req.session.flash = 'That listing is no longer available to claim.';
    return res.redirect(`/listings/${listing.id}`);
  }

  await prisma.$transaction([
    prisma.claim.create({
      data: { listingId: listing.id, recipientId: req.session.userId },
    }),
    prisma.listing.update({ where: { id: listing.id }, data: { status: 'CLAIMED' } }),
  ]);

  req.session.flash = 'Claim submitted. The donor will confirm pickup details.';
  res.redirect(`/listings/${listing.id}`);
});

// Donor confirms a pending claim.
claimsRouter.post('/claims/:id/confirm', requireRole('DONOR'), async (req, res) => {
  const claim = await prisma.claim.findUnique({
    where: { id: req.params.id },
    include: { listing: true },
  });

  if (!claim || claim.listing.donorId !== req.session.userId) {
    return res.status(404).render('error', { title: 'Not found', message: 'That claim does not exist.' });
  }

  if (!canTransitionClaim(claim.status, 'CONFIRMED')) {
    req.session.flash = 'That claim can no longer be confirmed.';
    return res.redirect(`/listings/${claim.listingId}`);
  }

  await prisma.claim.update({ where: { id: claim.id }, data: { status: 'CONFIRMED' } });
  req.session.flash = 'Claim confirmed.';
  res.redirect(`/listings/${claim.listingId}`);
});

// Either party can back out of a claim before pickup. If the claim was the
// only thing holding the listing as CLAIMED, the listing reopens.
claimsRouter.post('/claims/:id/cancel', async (req, res) => {
  const currentUser = res.locals.currentUser;
  if (!currentUser) {
    req.session.flash = 'Please sign in to continue.';
    return res.redirect('/login');
  }

  const claim = await prisma.claim.findUnique({
    where: { id: req.params.id },
    include: { listing: true },
  });

  if (!claim) {
    return res.status(404).render('error', { title: 'Not found', message: 'That claim does not exist.' });
  }

  const isParty =
    claim.recipientId === currentUser.id || claim.listing.donorId === currentUser.id;
  if (!isParty) {
    return res.status(403).render('error', { title: 'Not allowed', message: 'That is not your claim.' });
  }

  if (!canTransitionClaim(claim.status, 'CANCELLED')) {
    req.session.flash = 'That claim can no longer be cancelled.';
    return res.redirect(`/listings/${claim.listingId}`);
  }

  const updates = [prisma.claim.update({ where: { id: claim.id }, data: { status: 'CANCELLED' } })];

  // Reopening CLAIMED -> AVAILABLE is handled explicitly here rather than via
  // canTransitionListing, since that generic table intentionally does not
  // allow a CLAIMED listing back to AVAILABLE except through this specific
  // "claim fell through" path.
  if (claim.listing.status === 'CLAIMED') {
    updates.push(prisma.listing.update({ where: { id: claim.listing.id }, data: { status: 'AVAILABLE' } }));
  }

  await prisma.$transaction(updates);

  req.session.flash = 'Claim cancelled.';
  res.redirect(`/listings/${claim.listingId}`);
});
