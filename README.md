# FoodBridge

FoodBridge is a surplus food donation matching platform for small local organizations. Restaurants, grocers, caterers, and farms post surplus food with a pickup window and location; food banks, shelters, and pantries browse listings sorted by distance and claim what they can use, then the donor confirms the claim and marks it picked up. The goal is to serve the small local donors and recipients that the larger enterprise food-rescue platforms tend to underserve, using a stack simple enough to run reliably on a free cloud tier.

## Deploy your own copy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/RamahB0/foodbridge)

Clicking the button above walks you through creating a Render account (if you don't have one), then provisions a web service and a free managed PostgreSQL database from `render.yaml` in this repository. Render generates a random `SESSION_SECRET` and wires up `DATABASE_URL` automatically; you do not need to set either by hand. The first deploy runs `npm ci` followed by `npx prisma migrate deploy`, which creates the database tables, then starts the server with `npm start`. Once the deploy finishes, Render gives you a public `https://<your-service-name>.onrender.com` URL — that is the live app.

## Running locally

You will need Node.js 20 or later and a PostgreSQL database (a free one from Render, Neon, or Supabase works, or a local Postgres install).

Clone the repository and install dependencies with `npm install`. Copy `.env.example` to `.env` and fill in `DATABASE_URL` with your Postgres connection string, and generate a `SESSION_SECRET` with the command shown in the comments of `.env.example`. Then run `npx prisma migrate deploy` to create the database tables, and `npm run dev` to start the server with auto-reload. The app listens on `http://localhost:3000` by default.

Run `npm test` to run the unit test suite (pure business-logic tests for distance sorting and the listing/claim status state machine — these do not require a database connection) and `npm run lint` to run ESLint.

## Architecture

The stack is deliberately simple: Express.js with server-rendered EJS templates rather than a single-page app framework, plain JavaScript rather than TypeScript, PostgreSQL accessed through Prisma, and `express-session` with `connect-pg-simple` for database-backed sessions. Full reasoning for these choices — including why server-side rendering fits this project's likely users, and why a long-running Express server on Render was chosen over a serverless platform — is in the project report.

Directory layout: `server.js` is the application entrypoint. `src/routes/` holds Express routers split by concern (auth, listings, claims, static pages). `src/lib/` holds framework-independent modules — `distance.js` and `listingRules.js` have no dependency on Express or Prisma and are covered by the unit tests in `tests/`; `prisma.js`, `auth.js`, and `geocode.js` wrap the database client, password hashing, and address-to-coordinates lookup respectively. `src/middleware/` holds the session-based auth guards. `views/` holds the EJS templates, and `prisma/schema.prisma` defines the data model (`User`, `Listing`, `Claim`).

## Continuous integration

Every push and pull request to `main` runs `.github/workflows/ci.yml` on GitHub Actions: install dependencies, lint with ESLint, run the unit test suite, and syntax-check the server entrypoint.
