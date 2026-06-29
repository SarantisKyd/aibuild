// ─────────────────────────────────────────────
//  AIBuild — server.js
//  Paste this into Replit as server.js
//  Then: npm install express stripe @replit/database cors dotenv
//
//  Replit Secrets to add (click the lock icon):
//    STRIPE_SECRET_KEY       → your Stripe secret key (sk_test_...)
//    STRIPE_WEBHOOK_SECRET   → from Stripe dashboard → Webhooks
//    STRIPE_PUBLISHABLE_KEY  → your Stripe publishable key (pk_test_...)
//    APP_URL                 → your Replit app URL (https://yourapp.repl.co)
// ─────────────────────────────────────────────

const express = require('express');
const Stripe = require('stripe');
const Database = require('@replit/database');
const cors = require('cors');

const app = express();
const db = new Database();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PLATFORM_FEE_PERCENT = 15; // 15% commission
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ── Middleware ──────────────────────────────
// Stripe webhooks need raw body — must come before express.json()
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // serves index.html from /public folder

// ── Helpers ────────────────────────────────
function jobKey(id)     { return `job:${id}`; }
function builderKey(id) { return `builder:${id}`; }

async function nextId(prefix) {
  const key = `counter:${prefix}`;
  const current = (await db.get(key)) || 0;
  const next = current + 1;
  await db.set(key, next);
  return next;
}

// ── ROUTES ─────────────────────────────────

// POST /api/jobs — client posts a new job
// Body: { title, description, budget, deadline, skills, clientEmail }
app.post('/api/jobs', async (req, res) => {
  try {
    const { title, description, budget, deadline, skills, clientEmail } = req.body;

    if (!title || !budget || !clientEmail) {
      return res.status(400).json({ error: 'title, budget and clientEmail are required' });
    }

    const id = await nextId('job');
    const job = {
      id,
      title,
      description,
      budget: parseFloat(budget),
      deadline,
      skills: skills || [],
      clientEmail,
      status: 'unfunded',   // unfunded → funded → in_progress → delivered → complete
      bids: [],
      createdAt: Date.now(),
    };

    await db.set(jobKey(id), job);
    res.json({ success: true, job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs — list all funded/open jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const keys = await db.list('job:');
    const jobs = await Promise.all(keys.map(k => db.get(k)));
    // Only show funded jobs on the board (escrow paid)
    const open = jobs.filter(j => j && ['funded','in_progress'].includes(j.status));
    res.json(open);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id — single job detail
app.get('/api/jobs/:id', async (req, res) => {
  const job = await db.get(jobKey(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// POST /api/jobs/:id/bid — builder submits a bid
// Body: { builderEmail, builderName, price, deliveryTime, note, stripeAccountId }
app.post('/api/jobs/:id/bid', async (req, res) => {
  try {
    const job = await db.get(jobKey(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'funded') return res.status(400).json({ error: 'Job is not open for bids' });

    const bid = {
      id: Date.now(),
      ...req.body,
      submittedAt: Date.now(),
      status: 'pending',
    };

    job.bids = job.bids || [];
    job.bids.push(bid);
    await db.set(jobKey(job.id), job);
    res.json({ success: true, bid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STRIPE CONNECT — builder onboarding ────
// POST /api/builders/connect
// Creates a Stripe Connect account for a builder and returns an onboarding URL
app.post('/api/builders/connect', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    // Create a Stripe Express account for the builder
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: { name },
    });

    // Store mapping: email → stripe account id
    await db.set(builderKey(email), {
      email,
      name,
      stripeAccountId: account.id,
      createdAt: Date.now(),
      totalEarned: 0,
      jobsCompleted: 0,
    });

    // Generate an onboarding link (builder fills in their bank details on Stripe)
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${APP_URL}/builder-onboard?refresh=true`,
      return_url:  `${APP_URL}/builder-onboard?success=true`,
      type: 'account_onboarding',
    });

    res.json({ success: true, onboardingUrl: accountLink.url, accountId: account.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── STRIPE CHECKOUT — client funds escrow ──
// POST /api/jobs/:id/fund
// Creates a Stripe Checkout session. Client pays, money sits in YOUR platform account.
// Builder gets paid later via transfer when work is approved.
app.post('/api/jobs/:id/fund', async (req, res) => {
  try {
    const job = await db.get(jobKey(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'unfunded') return res.status(400).json({ error: 'Job already funded' });

    const budgetCents = Math.round(job.budget * 100);
    const feeCents    = Math.round(budgetCents * (PLATFORM_FEE_PERCENT / 100));

    // We charge the full amount; the fee stays on the platform; builder gets the rest later
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `AIBuild Escrow: ${job.title}`,
            description: `Budget: $${job.budget} · Platform fee (${PLATFORM_FEE_PERCENT}%): $${(feeCents/100).toFixed(2)} · Builder receives: $${((budgetCents - feeCents)/100).toFixed(2)}`,
          },
          unit_amount: budgetCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${APP_URL}/board?funded=${job.id}`,
      cancel_url:  `${APP_URL}/board?cancelled=${job.id}`,
      metadata: {
        jobId:    String(job.id),
        feeCents: String(feeCents),
        type:     'escrow_fund',
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── RELEASE PAYMENT — client approves work ──
// POST /api/jobs/:id/release
// Body: { builderEmail }  — pays builder via Stripe transfer minus platform fee
app.post('/api/jobs/:id/release', async (req, res) => {
  try {
    const job = await db.get(jobKey(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'delivered') return res.status(400).json({ error: 'Job not yet delivered' });

    const builder = await db.get(builderKey(req.body.builderEmail));
    if (!builder || !builder.stripeAccountId) {
      return res.status(400).json({ error: 'Builder has no Stripe account connected' });
    }

    const budgetCents = Math.round(job.budget * 100);
    const feeCents    = Math.round(budgetCents * (PLATFORM_FEE_PERCENT / 100));
    const builderCents = budgetCents - feeCents;

    // Transfer builder's share from platform account to their Stripe Express account
    const transfer = await stripe.transfers.create({
      amount:      builderCents,
      currency:    'usd',
      destination: builder.stripeAccountId,
      metadata: {
        jobId:        String(job.id),
        jobTitle:     job.title,
        platformFee:  String(feeCents),
      },
    });

    // Update records
    job.status = 'complete';
    job.paidAt = Date.now();
    job.transferId = transfer.id;
    await db.set(jobKey(job.id), job);

    builder.totalEarned    = (builder.totalEarned || 0) + builderCents / 100;
    builder.jobsCompleted  = (builder.jobsCompleted || 0) + 1;
    await db.set(builderKey(req.body.builderEmail), builder);

    res.json({
      success: true,
      transferId: transfer.id,
      builderPaid: `$${(builderCents / 100).toFixed(2)}`,
      platformFee: `$${(feeCents / 100).toFixed(2)}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mark job as delivered (builder calls this)
app.post('/api/jobs/:id/deliver', async (req, res) => {
  try {
    const job = await db.get(jobKey(req.params.id));
    if (!job) return res.status(404).json({ error: 'Not found' });
    job.status = 'delivered';
    job.deliveredAt = Date.now();
    job.deliveryNote = req.body.note || '';
    await db.set(jobKey(job.id), job);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STRIPE WEBHOOK ──────────────────────────
// Listens for Stripe events — marks job as funded when payment succeeds
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.metadata?.type === 'escrow_fund') {
      const jobId = session.metadata.jobId;
      const job = await db.get(jobKey(jobId));
      if (job) {
        job.status = 'funded';
        job.fundedAt = Date.now();
        job.stripeSessionId = session.id;
        await db.set(jobKey(job.id), job);
        console.log(`Job ${jobId} funded — $${job.budget} in escrow`);
      }
    }
  }

  res.json({ received: true });
});

// ── CONFIG endpoint for frontend ────────────
app.get('/api/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    platformFeePercent: PLATFORM_FEE_PERCENT,
  });
});

// ── START ───────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AIBuild running on port ${PORT}`));
