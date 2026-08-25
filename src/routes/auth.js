import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, isValidEmail } from '../lib/auth.js';
import { geocodeAddress } from '../lib/geocode.js';

export const authRouter = Router();

authRouter.get('/register', (req, res) => {
  res.render('register', { title: 'Create an account', error: null, form: {} });
});

authRouter.post('/register', async (req, res) => {
  const { email, password, role, orgName, address, phone } = req.body;

  const form = { email, role, orgName, address, phone };

  if (!isValidEmail(email) || !password || password.length < 8) {
    return res.status(400).render('register', {
      title: 'Create an account',
      error: 'Enter a valid email and a password of at least 8 characters.',
      form,
    });
  }

  if (role !== 'DONOR' && role !== 'RECIPIENT') {
    return res.status(400).render('register', {
      title: 'Create an account',
      error: 'Choose whether you are donating or receiving food.',
      form,
    });
  }

  if (!orgName || !address) {
    return res.status(400).render('register', {
      title: 'Create an account',
      error: 'Organization name and address are required.',
      form,
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).render('register', {
      title: 'Create an account',
      error: 'An account with that email already exists.',
      form,
    });
  }

  const coords = await geocodeAddress(address);
  if (!coords) {
    return res.status(400).render('register', {
      title: 'Create an account',
      error: 'We could not locate that address. Try including city and state.',
      form,
    });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      orgName,
      address,
      phone: phone || null,
      lat: coords.lat,
      lng: coords.lng,
    },
  });

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.orgName = user.orgName;
  req.session.flash = `Welcome, ${user.orgName}!`;

  res.redirect(user.role === 'DONOR' ? '/dashboard' : '/listings');
});

authRouter.get('/login', (req, res) => {
  res.render('login', { title: 'Sign in', error: null, form: {} });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const valid = user ? await verifyPassword(password || '', user.passwordHash) : false;

  if (!user || !valid) {
    return res.status(400).render('login', {
      title: 'Sign in',
      error: 'Incorrect email or password.',
      form: { email },
    });
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.orgName = user.orgName;
  req.session.flash = `Welcome back, ${user.orgName}!`;

  res.redirect(user.role === 'DONOR' ? '/dashboard' : '/listings');
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});
