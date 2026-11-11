const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formController');
const { formAnswerUpload } = require('../middleware/upload');

// Filling a form is deliberately unauthenticated: a PUBLIC form needs no
// account at all, and a PRIVATE one reads the bearer token itself so that a
// stale token shows a sign-in prompt rather than an error page.
//
// That makes this the only write endpoint on the API open to the internet, so
// it gets a small per-IP throttle. In-memory on purpose: one backend process,
// and a cache that empties on restart is the right trade for a few lines of
// code over another dependency.
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();

// Two counters per IP: one for submissions, one for uploads. An upload costs
// us storage, so it gets its own, tighter allowance.
const throttle = (bucket, max, message) => (req, res, next) => {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) return res.status(429).json({ message });
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

// Multer rejects an oversized or wrong-typed file by throwing; without this
// the responder would get the generic 500 page instead of being told why.
const uploadOrExplain = (req, res, next) => {
  formAnswerUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'That file is larger than 25 MB.'
      : err.message || 'That file could not be accepted.';
    return res.status(400).json({ message });
  });
};

// A scanning point asks for the next code on a timer. The allowance is sized
// for a hall full of screens behind one address, not for a single phone.
router.get(
  '/:slug/display',
  throttle('disp', 600, 'Too many requests for codes from this network.'),
  ctrl.publicDisplay,
);

router.get('/:slug', ctrl.publicGet);
router.post(
  '/:slug/upload',
  throttle('up', 20, 'Too many uploads from this network. Try again in a few minutes.'),
  uploadOrExplain,
  ctrl.publicUpload,
);
router.post(
  '/:slug',
  throttle('post', 30, 'Too many submissions from this network. Try again in a few minutes.'),
  ctrl.publicSubmit,
);

module.exports = router;
