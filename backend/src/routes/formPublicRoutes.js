const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formController');

// Filling a form is deliberately unauthenticated: a PUBLIC form needs no
// account at all, and a PRIVATE one reads the bearer token itself so that a
// stale token shows a sign-in prompt rather than an error page.
//
// That makes this the only write endpoint on the API open to the internet, so
// it gets a small per-IP throttle. In-memory on purpose: one backend process,
// and a cache that empties on restart is the right trade for a few lines of
// code over another dependency.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMITS = 30;
const hits = new Map();

const throttle = (req, res, next) => {
  const key = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_SUBMITS) {
    return res.status(429).json({ message: 'Too many submissions from this network. Try again in a few minutes.' });
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing without bound on a long-running process.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  return next();
};

router.get('/:slug', ctrl.publicGet);
router.post('/:slug', throttle, ctrl.publicSubmit);

module.exports = router;
