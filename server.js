import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import pgSimple from 'connect-pg-simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { attachCurrentUser } from './src/middleware/auth.js';
import { authRouter } from './src/routes/auth.js';
import { listingsRouter } from './src/routes/listings.js';
import { claimsRouter } from './src/routes/claims.js';
import { pagesRouter } from './src/routes/pages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // needed for secure cookies behind Render's proxy

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PgSession = pgSimple(session);
const sessionPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({ pool: sessionPool, tableName: 'user_sessions', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

app.use(attachCurrentUser);

app.use('/', pagesRouter);
app.use('/', authRouter);
app.use('/', listingsRouter);
app.use('/', claimsRouter);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'Page not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Something went wrong', message: 'An unexpected error occurred.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`FoodBridge listening on port ${port}`);
});
