// Actionable notifications for students. Admin/HOD create a prompt
// scoped to an academic session (or all sessions); every student in
// that session sees it and must respond (acknowledge, type an answer,
// or pick from options). Admin can see who has / hasn't responded.

const { Op } = require('sequelize');
const {
  sequelize, NotificationPrompt, NotificationPromptResponse,
  AcademicSession, User, StudentSession,
} = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');

const isAdmin = (role) => role === 'ADMIN' || role === 'HOD';
const PROMPT_TYPES = new Set(['ACK', 'TEXT', 'CHOICE', 'FILE']);

function sanitiseTitle(s) {
  return String(s || '').trim().slice(0, 250);
}

function sanitiseBody(s, max = 5000) {
  return s == null ? null : String(s).slice(0, max);
}

// POST /api/notification-prompts  (admin/HOD)
exports.create = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    const title = sanitiseTitle(req.body?.title);
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const type = String(req.body?.promptType || 'ACK').toUpperCase();
    if (!PROMPT_TYPES.has(type)) return res.status(400).json({ message: 'Invalid promptType' });

    let options = null;
    if (type === 'CHOICE') {
      const raw = Array.isArray(req.body?.options) ? req.body.options : [];
      options = raw.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 20);
      if (options.length < 2) {
        return res.status(400).json({ message: 'CHOICE prompts need at least 2 options' });
      }
    }
    const sessionId = req.body?.sessionId || null;
    if (sessionId) {
      const s = await AcademicSession.findByPk(sessionId);
      if (!s) return res.status(400).json({ message: 'Unknown session' });
    }

    // Optional admin attachment (any prompt type)
    let attachment = null;
    if (req.file) {
      try {
        const url = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          'notification-prompts',
        );
        attachment = { url, name: req.file.originalname, mime: req.file.mimetype };
      } catch (e) {
        console.error('NotificationPrompt attachment upload error:', e);
        return res.status(500).json({ message: 'Failed to upload attachment' });
      }
    }

    const prompt = await NotificationPrompt.create({
      title,
      body: sanitiseBody(req.body?.body),
      promptType: type,
      options,
      sessionId,
      deadline: req.body?.deadline ? new Date(req.body.deadline) : null,
      createdBy: req.user.id,
      attachmentUrl: attachment?.url || null,
      attachmentName: attachment?.name || null,
      attachmentMime: attachment?.mime || null,
    });
    res.status(201).json({ prompt });
  } catch (e) {
    console.error('NotificationPrompt create error:', e);
    res.status(500).json({ message: 'Failed to create notification' });
  }
};

// GET /api/notification-prompts  (admin/HOD)  ?sessionId=  ?status=
// Returns each prompt with counts of eligible students, responded, pending.
exports.list = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    const where = {};
    if (req.query.sessionId) where.sessionId = req.query.sessionId;
    if (req.query.status) where.status = String(req.query.status).toUpperCase();

    const prompts = await NotificationPrompt.findAll({
      where,
      include: [
        { model: AcademicSession, as: 'Session', attributes: ['id', 'name'] },
        { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Response + eligibility counts per prompt
    const promptIds = prompts.map((p) => p.id);
    const respCounts = promptIds.length
      ? await NotificationPromptResponse.findAll({
          where: { promptId: { [Op.in]: promptIds } },
          attributes: [
            'promptId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'n'],
          ],
          group: ['promptId'],
          raw: true,
        })
      : [];
    const respByPrompt = new Map(respCounts.map((r) => [r.promptId, Number(r.n)]));

    // Eligibility: count of students in the target session
    const sessionIds = Array.from(new Set(prompts.map((p) => p.sessionId).filter(Boolean)));
    const sessionCounts = new Map();
    if (sessionIds.length) {
      const rows = await StudentSession.findAll({
        where: { academicSessionId: { [Op.in]: sessionIds } },
        attributes: [
          'academicSessionId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'n'],
        ],
        group: ['academicSessionId'],
        raw: true,
      });
      for (const r of rows) sessionCounts.set(r.academicSessionId, Number(r.n));
    }
    // Total students across every session (for "all sessions" prompts)
    const [{ n: totalStudents } = { n: 0 }] = await StudentSession.findAll({
      attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'n']],
      raw: true,
    });

    const out = prompts.map((p) => {
      const eligible = p.sessionId
        ? (sessionCounts.get(p.sessionId) || 0)
        : Number(totalStudents || 0);
      const responded = respByPrompt.get(p.id) || 0;
      return {
        id: p.id,
        title: p.title,
        body: p.body,
        promptType: p.promptType,
        options: p.options,
        deadline: p.deadline,
        status: p.status,
        createdAt: p.createdAt,
        sessionId: p.sessionId,
        attachmentUrl: p.attachmentUrl,
        attachmentName: p.attachmentName,
        attachmentMime: p.attachmentMime,
        Session: p.Session,
        Creator: p.Creator,
        eligible,
        responded,
        pending: Math.max(0, eligible - responded),
      };
    });
    res.json({ prompts: out });
  } catch (e) {
    console.error('NotificationPrompt list error:', e);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
};

// GET /api/notification-prompts/:id/responses  (admin/HOD)
// Full response detail — who responded, when, what they said, plus
// the pending students so admin can nudge them.
exports.responses = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    const prompt = await NotificationPrompt.findByPk(req.params.id, {
      include: [{ model: AcademicSession, as: 'Session', attributes: ['id', 'name'] }],
    });
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const [responses, eligible] = await Promise.all([
      NotificationPromptResponse.findAll({
        where: { promptId: prompt.id },
        include: [{
          model: User, as: 'Student',
          attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
        }],
        order: [['respondedAt', 'DESC']],
      }),
      // Eligible = students in the target session (or all if null)
      StudentSession.findAll({
        where: prompt.sessionId ? { academicSessionId: prompt.sessionId } : {},
        include: [{
          model: User, as: 'Student',
          attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
        }],
      }),
    ]);

    const respondedIds = new Set(responses.map((r) => r.studentUserId));
    const pendingStudents = eligible
      .map((ss) => ss.Student)
      .filter((u) => u && !respondedIds.has(u.id));

    res.json({
      prompt,
      responses,
      pendingStudents,
      totals: {
        eligible: eligible.length,
        responded: responses.length,
        pending: pendingStudents.length,
      },
    });
  } catch (e) {
    console.error('NotificationPrompt responses error:', e);
    res.status(500).json({ message: 'Failed to load responses' });
  }
};

// DELETE /api/notification-prompts/:id  (admin/HOD)
exports.remove = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    const prompt = await NotificationPrompt.findByPk(req.params.id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    // Best-effort S3 cleanup: admin attachment + every student response file.
    const responseFiles = await NotificationPromptResponse.findAll({
      where: { promptId: prompt.id, responseFileUrl: { [Op.ne]: null } },
      attributes: ['responseFileUrl'],
    });
    const urls = [
      prompt.attachmentUrl,
      ...responseFiles.map((r) => r.responseFileUrl),
    ].filter(Boolean);
    for (const u of urls) {
      try { await deleteFromS3(u); } catch (e) { /* best effort */ }
    }
    await prompt.destroy(); // responses cascade via association
    res.json({ ok: true });
  } catch (e) {
    console.error('NotificationPrompt remove error:', e);
    res.status(500).json({ message: 'Failed to delete' });
  }
};

// PATCH /api/notification-prompts/:id/archive  (admin/HOD)  ?unarchive=1 to reopen
exports.archive = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    const prompt = await NotificationPrompt.findByPk(req.params.id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    const status = req.query.unarchive === '1' ? 'ACTIVE' : 'ARCHIVED';
    await prompt.update({ status });
    res.json({ prompt });
  } catch (e) {
    console.error('NotificationPrompt archive error:', e);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

// ---- Student side -----------------------------------------------------

// GET /api/notification-prompts/mine
// Active prompts targeting this student's session that they haven't
// responded to yet.
exports.myPending = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.json({ prompts: [] });
    }
    // Which sessions is the student in?
    const enrolments = await StudentSession.findAll({
      where: { userId: req.user.id },
      attributes: ['academicSessionId'],
      raw: true,
    });
    const mySessionIds = enrolments.map((e) => e.academicSessionId).filter(Boolean);

    // Prompts targeting one of my sessions OR every session (sessionId IS NULL)
    const prompts = await NotificationPrompt.findAll({
      where: {
        status: 'ACTIVE',
        [Op.or]: [
          { sessionId: { [Op.is]: null } },
          ...(mySessionIds.length ? [{ sessionId: { [Op.in]: mySessionIds } }] : []),
        ],
      },
      include: [
        { model: AcademicSession, as: 'Session', attributes: ['id', 'name'] },
        { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Filter out the ones I've already answered
    const answered = await NotificationPromptResponse.findAll({
      where: {
        studentUserId: req.user.id,
        promptId: { [Op.in]: prompts.map((p) => p.id) },
      },
      attributes: ['promptId'],
      raw: true,
    });
    const answeredIds = new Set(answered.map((a) => a.promptId));

    const pending = prompts.filter((p) => !answeredIds.has(p.id));
    res.json({ prompts: pending });
  } catch (e) {
    console.error('NotificationPrompt myPending error:', e);
    res.status(500).json({ message: 'Failed to load prompts' });
  }
};

// POST /api/notification-prompts/:id/respond
// Body: { text?, choice? } depending on promptType. ACK needs neither.
exports.respond = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can respond' });
    }
    const prompt = await NotificationPrompt.findByPk(req.params.id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    if (prompt.status !== 'ACTIVE') return res.status(400).json({ message: 'This notification is closed' });

    // Verify eligibility — student must be in the target session (or the
    // prompt targets every session).
    if (prompt.sessionId) {
      const enrol = await StudentSession.findOne({
        where: { userId: req.user.id, academicSessionId: prompt.sessionId },
      });
      if (!enrol) return res.status(403).json({ message: 'Not in this session' });
    }

    // Build the response by type
    const patch = { promptId: prompt.id, studentUserId: req.user.id, respondedAt: new Date() };
    if (prompt.promptType === 'TEXT') {
      const text = sanitiseBody(req.body?.text);
      if (!text || !text.trim()) return res.status(400).json({ message: 'Answer is required' });
      patch.responseText = text.trim();
    } else if (prompt.promptType === 'CHOICE') {
      const choice = String(req.body?.choice || '').trim();
      const options = prompt.options || [];
      if (!options.includes(choice)) return res.status(400).json({ message: 'Invalid choice' });
      patch.responseChoice = choice;
    } else if (prompt.promptType === 'FILE') {
      if (!req.file) return res.status(400).json({ message: 'File is required' });
    }
    // ACK carries no payload — the row itself IS the acknowledgement.

    // Optional file for FILE (required) and TEXT (optional). Upload
    // BEFORE upsert so we don't half-write a response with no file.
    let uploaded = null;
    if (req.file && (prompt.promptType === 'FILE' || prompt.promptType === 'TEXT')) {
      try {
        const url = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          'notification-prompts',
        );
        uploaded = { url, name: req.file.originalname, mime: req.file.mimetype };
      } catch (e) {
        console.error('NotificationPrompt response upload error:', e);
        return res.status(500).json({ message: 'Failed to upload file' });
      }
    }

    // Upsert on (promptId, studentUserId)
    const existing = await NotificationPromptResponse.findOne({
      where: { promptId: prompt.id, studentUserId: req.user.id },
    });
    if (uploaded) {
      patch.responseFileUrl = uploaded.url;
      patch.responseFileName = uploaded.name;
      patch.responseFileMime = uploaded.mime;
    }
    if (existing) {
      // Clean up the previous file if we're replacing it
      if (uploaded && existing.responseFileUrl) {
        try { await deleteFromS3(existing.responseFileUrl); } catch (e) { /* best effort */ }
      }
      await existing.update(patch);
      return res.json({ response: existing, message: 'Response updated' });
    }
    const created = await NotificationPromptResponse.create(patch);
    res.status(201).json({ response: created, message: 'Submitted' });
  } catch (e) {
    console.error('NotificationPrompt respond error:', e);
    res.status(500).json({ message: 'Failed to submit response' });
  }
};
