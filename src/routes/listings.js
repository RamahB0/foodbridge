import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { geocodeAddress } from '../lib/geocode.js';
import { sortByDistance } from '../lib/distance.js';
import { canTransitionListing, canEditListing, isPastExpiry } from '../lib/listingRules.js';
import { requireRole } from '../middleware/auth.js';

export const listingsRouter = Router();

// Browse available listings, nearest-first relative to the signed-in
// recipient's registered address. Donors can also browse, mainly to see
// what similar orgs are posting.
listingsRouter.get('/listings', async (req, res) => {
  const listings = await prisma.listing.findMany({
    where: { status: 'AVAILABLE' },
    include: { donor: { select: { orgName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const currentUser = res.locals.currentUser;
  const sorted = currentUser
    ? sortByDistance(listings, currentUser.lat ?? 0, currentUser.lng ?? 0)
    : listings;

  res.render('listings', { title: 'Available food', listings: sorted });
});

listingsRouter.get('/listings/new', requireRole('DONOR'), (req, res) => {
  res.render('listing-new', { title: 'Post surplus food', error: null, form: {} });
});

listingsRouter.post('/listings/new', requireRole('DONOR'), async (req, res) => {
  const {
    title,
    description,
    category,
    quantity,
    pickupAddress,
    pickupWindowStart,
    pickupWindowEnd,
    expiresAt,
  } = req.body;

  const form = {
    title,
    description,
    category,
    quantity,
    pickupAddress,
    pickupWindowStart,
    pickupWindowEnd,
    expiresAt,
  };

  if (!title || !description || !category || !quantity || !pickupAddress) {
    return res.status(400).render('listing-new', {
      title: 'Post surplus food',
      error: 'Fill in every field before posting.',
      form,
    });
  }

  const start = new Date(pickupWindowStart);
  const end = new Date(pickupWindowEnd);
  const expiry = new Date(expiresAt);

  if ([start, end, expiry].some((d) => Number.isNaN(d.getTime())) || end <= start) {
    return res.status(400).render('listing-new', {
      title: 'Post surplus food',
      error: 'Check the pickup window and expiry — the end time must be after the start.',
      form,
    });
  }

  const coords = await geocodeAddress(pickupAddress);
  if (!coords) {
    return res.status(400).render('listing-new', {
      title: 'Post surplus food',
      error: 'We could not locate that pickup address. Try including city and state.',
      form,
    });
  }

  const listing = await prisma.listing.create({
    data: {
      donorId: req.session.userId,
      title,
      description,
      category,
      quantity,
      pickupAddress,
      lat: coords.lat,
      lng: coords.lng,
      pickupWindowStart: start,
      pickupWindowEnd: end,
      expiresAt: expiry,
    },
  });

  req.session.flash = 'Listing posted.';
  res.redirect(`/listings/${listing.id}`);
});

listingsRouter.get('/listings/:id', async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      donor: { select: { orgName: true, phone: true } },
      claims: {
        include: { recipient: { select: { orgName: true, phone: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!listing) {
    return res.status(404).render('error', { title: 'Not found', message: 'That listing does not exist.' });
  }

  const effectiveStatus = isPastExpiry(listing) ? 'EXPIRED' : listing.status;
  const currentUser = res.locals.currentUser;
  const isOwner = currentUser ? canEditListing(listing, currentUser.id) : false;
  const myClaim = currentUser
    ? listing.claims.find((c) => c.recipientId === currentUser.id)
    : null;

  res.render('listing-detail', {
    title: listing.title,
    listing: { ...listing, status: effectiveStatus },
    isOwner,
    myClaim,
  });
});

listingsRouter.post('/listings/:id/cancel', requireRole('DONOR'), async (req, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });

  if (!listing || !canEditListing(listing, req.session.userId)) {
    return res.status(404).render('error', { title: 'Not found', message: 'That listing does not exist.' });
  }

  if (!canTransitionListing(listing.status, 'CANCELLED')) {
    req.session.flash = 'That listing can no longer be cancelled.';
    return res.redirect(`/listings/${listing.id}`);
  }

  await prisma.listing.update({ where: { id: listing.id }, data: { status: 'CANCELLED' } });
  req.session.flash = 'Listing cancelled.';
  res.redirect(`/listings/${listing.id}`);
});

listingsRouter.post('/listings/:id/picked-up', requireRole('DONOR'), async (req, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });

  if (!listing || !canEditListing(listing, req.session.userId)) {
    return res.status(404).render('error', { title: 'Not found', message: 'That listing does not exist.' });
  }

  if (!canTransitionListing(listing.status, 'PICKED_UP')) {
    req.session.flash = 'That listing is not ready to be marked picked up.';
    return res.redirect(`/listings/${listing.id}`);
  }

  await prisma.listing.update({ where: { id: listing.id }, data: { status: 'PICKED_UP' } });
  await prisma.claim.updateMany({
    where: { listingId: listing.id, status: 'CONFIRMED' },
    data: { status: 'COMPLETED' },
  });

  req.session.flash = 'Marked as picked up.';
  res.redirect(`/listings/${listing.id}`);
});
