const { LandingContent } = require('../models');

const KEY = 'main';

/**
 * Default payload — used as the seed and as a safety net if the row
 * is ever deleted. Mirrors the structure the landing page expects.
 */
const DEFAULT_PAYLOAD = {
  hero: {
    eyebrow: 'Graphic Era School of Management',
    title1: 'Shaping Future',
    title2: 'Business Leaders.',
    paragraph:
      'Two decades of academic excellence in management education at Graphic Era University, Dehradun — postgraduate and doctoral programmes designed for the next generation of managers, analysts and founders.',
    primaryCta: { label: 'Begin application', href: 'https://apply.geu.ac.in/' },
    secondaryCta: { label: 'View programmes', href: '#programmes' },
    stats: [
      { fig: '20+',      cap: 'Years of excellence' },
      { fig: '5',        cap: 'Programmes' },
      { fig: '14',       cap: 'MBA specialisations' },
      { fig: '₹15.40 L', cap: 'Highest package · 2025' },
    ],
  },
  about: {
    eyebrow: 'About GESoM',
    heading:
      'A hub for nurturing top-tier leadership in the corporate world — recognised among the best management schools in India.',
    cards: [
      {
        k: '01',
        h: 'Two decades of teaching',
        p: 'A management department founded in 2006, with twenty years of academic record across MBA, MBA IMPACT, AI & Data Science and the doctoral programme.',
      },
      {
        k: '02',
        h: 'Industry partnerships',
        p: 'Programmes built with corporate partners — including the M.B.A in Business Analytics delivered with Grant Thornton as Industry Partner.',
      },
      {
        k: '03',
        h: 'A campus that supports the work',
        p: 'Lecture theatres, computer and analytics labs, syndicate rooms, board rooms and one of the largest libraries in the region.',
      },
    ],
  },
  programmes: {
    eyebrow: 'I — Programmes',
    heading: 'Five programmes for the modern manager.',
    sub: 'Postgraduate and doctoral degrees across general management, analytics, artificial intelligence and applied business analytics. Open any programme for tracks & specialisations.',
    items: [
      {
        code: '01',
        name: 'Master of Business Administration (MBA)',
        duration: '2 Years',
        note: 'A two-year full-time MBA built on a rigorous core curriculum and a wide arc of specialisations.',
        specs: [
          'Marketing', 'Finance', 'Human Resource Management',
          'Logistics & Supply Chain Management', 'Hospital Administration',
          'Airport & Airline Management', 'International Business',
          'Banking & Insurance', 'Fintech', 'Digital Marketing',
          'Branding & Advertising', 'Retail', 'Entrepreneurship',
          'Sports Management',
        ],
      },
      {
        code: '02',
        name: 'MBA (IMPACT)',
        duration: '2 Years',
        note: 'An industry-integrated MBA, structured around live projects and senior corporate mentorship.',
      },
      {
        code: '03',
        name: 'MBA in Artificial Intelligence (AI) & Data Science (DS)',
        duration: '2 Years',
        note: 'A STEM-aligned MBA in applied machine learning, analytics and the strategic use of data.',
      },
      {
        code: '04',
        name: 'M.B.A Business Analytics (Industry Partner — Grant Thornton)',
        duration: '2 Years',
        note: 'Delivered with Grant Thornton as Industry Partner — analytics, audit and consulting at scale.',
      },
      {
        code: '05',
        name: 'Ph.D. in Management Studies',
        duration: 'Doctoral',
        note: 'A research-intensive doctorate for scholars and practitioners working at the frontier of management thought.',
      },
    ],
  },
  placements: {
    eyebrow: 'II — Placements',
    heading: 'Class of 2025 — featured offers.',
    sub: 'A selection of placements from the 2025 graduating cohort.',
    featuredImage:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
    featuredLabel: '100% Placement Record',
    items: [
      {
        name: 'Dikshant Sharma',
        program: 'MBA',
        pkg: '₹15.40 L',
        year: '2025',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
      },
      {
        name: 'Shreyansh Rohilla',
        program: 'MBA-Impact',
        pkg: '₹10.20 L',
        year: '2025',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
      },
      {
        name: 'Vanshika Kakkar',
        program: 'MBA',
        pkg: '₹10.20 L',
        year: '2025',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
      },
      {
        name: 'Shreya Raj',
        program: 'MBA',
        pkg: '₹10.20 L',
        year: '2025',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
      },
      {
        name: 'Chanchal Gupta',
        program: 'MBA',
        pkg: '₹10.20 L',
        year: '2025',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
      },
    ],
  },
  campus: {
    eyebrow: 'III — Campus',
    heading: 'Thirteen rooms, two blocks, one campus.',
    sub: 'Lecture theatres, syndicate rooms, computer and analytics labs, a board room, a tutorial wing and the central library — the working environments of the Department of Management.',
    items: [
      { name: 'Library', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69de269edf155-1776166558.webp' },
      { name: 'Lecture Theatre', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e92349404-1778837795.webp' },
      { name: 'Seminar Hall', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69d648140530b-1775650836.webp' },
      { name: 'Conference Hall', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e92d5c1f4-1778837805.webp' },
      { name: 'Computer Lab', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69de26a23e8e2-1776166562.webp' },
      { name: 'Classroom', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69de26969e5a4-1776166550.webp' },
      { name: 'Board Room — Chanakya Block', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e89713b20e3-1776850707.webp' },
      { name: 'Dell Lab', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e952dfa9e-1778837842.webp' },
      { name: 'Vidhan Sabha', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e94fd0fac-1778837839.webp' },
      { name: 'Lecture Theatre — Chanakya Block', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e89735c53c3-1776850741.webp' },
      { name: 'Lecture Theatre — New Building', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e8973c6ba0b-1776850748.webp' },
      { name: 'Seminar Hall — Chanakya Block', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e8975a8bff0-1776850778.webp' },
      { name: 'Tutorial Room', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e8976220c5f-1776850786.webp' },
    ],
  },
  cta: {
    eyebrow: 'Admissions 2026 — now open',
    title1: 'Apply to the',
    title2: 'Class of 2028.',
    paragraph: 'Submit your application online. Admissions enquiries are answered within five working days.',
  },
  contact: {
    eyebrow: 'IV — Contact',
    heading: 'Reach the admissions office.',
    address: '566/6, Bell Road, Society Area, Clement Town, Dehradun, Uttarakhand — 248002',
    phones: ['1800 270 1280', '1800 890 6027'],
    emails: ['admissions@geu.ac.in', 'enquiry@geu.ac.in'],
  },
};

/**
 * GET /api/landing — public, no auth.
 * Returns the stored payload, or DEFAULT_PAYLOAD if the row hasn't
 * been created yet. We never throw — the landing page must always render.
 */
/**
 * Coerce a stored payload to an object. Some MySQL builds report the
 * JSON column as TEXT and Sequelize hands it back as a string — in
 * that case we parse it here so callers always get a real object.
 */
function asObject(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      // Guard against double-stringified values
      if (typeof parsed === 'string') {
        try { return JSON.parse(parsed); } catch { return null; }
      }
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

async function getLandingContent(req, res) {
  // Never cache the landing payload — admin edits must show up on the
  // next page reload, with no stale window.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const row = await LandingContent.findOne({ where: { contentKey: KEY } });
    if (!row) {
      return res.json({ payload: DEFAULT_PAYLOAD, isDefault: true });
    }
    const obj = asObject(row.payload);
    if (!obj) {
      // Stored value is unreadable — serve defaults rather than crashing the
      // public site. Admin can resave from /admin/landing to repair it.
      console.error('[landing] stored payload is unreadable, serving defaults');
      return res.json({ payload: DEFAULT_PAYLOAD, isDefault: true });
    }
    return res.json({ payload: obj, isDefault: false, updatedAt: row.updatedAt });
  } catch (err) {
    console.error('[landing] GET failed, serving defaults:', err.message);
    return res.json({ payload: DEFAULT_PAYLOAD, isDefault: true });
  }
}

/**
 * PUT /api/landing — ADMIN/HOD only.
 * Upserts the single landing-content row.
 */
async function updateLandingContent(req, res) {
  try {
    // Accept either { payload: { ... } } or a raw object body.
    let payload = req.body?.payload ?? req.body;
    payload = asObject(payload);
    if (!payload) {
      return res.status(400).json({ message: 'payload must be a JSON object' });
    }

    const [row, created] = await LandingContent.findOrCreate({
      where: { contentKey: KEY },
      defaults: { contentKey: KEY, payload, updatedBy: req.user?.id || null },
    });

    if (!created) {
      row.payload = payload;
      row.updatedBy = req.user?.id || null;
      await row.save();
    }

    // Echo back as a real object so the editor never has to re-parse.
    return res.json({
      message: 'Landing content saved',
      payload: asObject(row.payload),
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    console.error('[landing] PUT failed:', err);
    return res.status(500).json({ message: 'Failed to save landing content' });
  }
}

/**
 * POST /api/landing/reset — ADMIN/HOD only.
 * Restores DEFAULT_PAYLOAD.
 */
async function resetLandingContent(req, res) {
  try {
    const [row, created] = await LandingContent.findOrCreate({
      where: { contentKey: KEY },
      defaults: { contentKey: KEY, payload: DEFAULT_PAYLOAD, updatedBy: req.user?.id || null },
    });
    if (!created) {
      row.payload = DEFAULT_PAYLOAD;
      row.updatedBy = req.user?.id || null;
      await row.save();
    }
    return res.json({ message: 'Reset to defaults', payload: row.payload });
  } catch (err) {
    console.error('[landing] reset failed:', err);
    return res.status(500).json({ message: 'Failed to reset landing content' });
  }
}

module.exports = {
  getLandingContent,
  updateLandingContent,
  resetLandingContent,
  DEFAULT_PAYLOAD,
};
