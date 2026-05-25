// Admin-only private notes about a faculty member. The faculty themselves
// never see these — every endpoint is gated to ADMIN.

const { FacultyNote, User } = require('../models');

const facultyNoteController = {
  // POST /api/faculty-notes  { facultyId, note }
  create: async (req, res) => {
    try {
      const { facultyId, note } = req.body || {};
      const trimmed = (note || '').toString().trim();
      if (!facultyId || !trimmed) {
        return res.status(400).json({ message: 'facultyId and note are required' });
      }
      const facultyUser = await User.findByPk(facultyId);
      if (!facultyUser) return res.status(404).json({ message: 'Faculty not found' });

      const row = await FacultyNote.create({
        facultyId,
        createdBy: req.user.id,
        note: trimmed.slice(0, 5000),
      });

      const created = await FacultyNote.findByPk(row.id, {
        include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      res.status(201).json({ note: created });
    } catch (error) {
      console.error('FacultyNote create error:', error);
      res.status(500).json({ message: 'Failed to create note' });
    }
  },

  // GET /api/faculty-notes?facultyId=X
  list: async (req, res) => {
    try {
      const { facultyId } = req.query;
      if (!facultyId) return res.status(400).json({ message: 'facultyId is required' });
      const notes = await FacultyNote.findAll({
        where: { facultyId: String(facultyId) },
        order: [['createdAt', 'DESC']],
        include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      res.json({ notes });
    } catch (error) {
      console.error('FacultyNote list error:', error);
      res.status(500).json({ message: 'Failed to list notes' });
    }
  },

  // PATCH /api/faculty-notes/:id  { note }
  update: async (req, res) => {
    try {
      const row = await FacultyNote.findByPk(req.params.id);
      if (!row) return res.status(404).json({ message: 'Note not found' });
      const trimmed = (req.body?.note || '').toString().trim();
      if (!trimmed) return res.status(400).json({ message: 'Note text required' });
      await row.update({ note: trimmed.slice(0, 5000) });
      res.json({ note: row });
    } catch (error) {
      console.error('FacultyNote update error:', error);
      res.status(500).json({ message: 'Failed to update note' });
    }
  },

  // DELETE /api/faculty-notes/:id
  remove: async (req, res) => {
    try {
      const row = await FacultyNote.findByPk(req.params.id);
      if (!row) return res.status(404).json({ message: 'Note not found' });
      await row.destroy();
      res.json({ message: 'Note deleted', id: req.params.id });
    } catch (error) {
      console.error('FacultyNote delete error:', error);
      res.status(500).json({ message: 'Failed to delete note' });
    }
  },
};

module.exports = facultyNoteController;
