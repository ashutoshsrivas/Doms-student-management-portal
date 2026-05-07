const { Announcement, User } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');
const path = require('path');

// Get all public announcements
exports.getPublicAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: { type: 'PUBLIC', status: 'ACTIVE' },
      include: {
        model: User,
        as: 'Creator',
        attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage', 'approvedRole']
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Error fetching public announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching announcements',
      error: error.message
    });
  }
};

// Get all announcements (private + public) - requires authentication
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: { status: 'ACTIVE' },
      include: {
        model: User,
        as: 'Creator',
        attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage', 'approvedRole']
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching announcements',
      error: error.message
    });
  }
};

// Get single announcement by ID
exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByPk(id, {
      include: {
        model: User,
        as: 'Creator',
        attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage', 'approvedRole']
      }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has access to this announcement
    const isAdmin = req.user && ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'].includes(req.user.role);
    if (announcement.type === 'PRIVATE' && (!req.user || (announcement.createdBy !== req.user.id && !isAdmin))) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this announcement'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching announcement',
      error: error.message
    });
  }
};

// Create announcement - only Admin, HOD, Placement Coordinator
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has permission to create announcements
    const allowedRoles = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only Admin, HOD, and Placement Coordinators can create announcements'
      });
    }

    // Validate input
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const announcementData = {
      title,
      content,
      type: type || 'PUBLIC',
      createdBy: userId,
      status: 'ACTIVE'
    };

    // Handle file upload if present
    if (req.file) {
      try {
        const fileUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'announcements');
        
        announcementData.fileUrl = fileUrl;
        announcementData.fileName = req.file.originalname;
        announcementData.fileType = req.file.mimetype;

        // Detect image orientation
        if (req.file.mimetype.startsWith('image/')) {
          try {
            const imageDimensions = req.body.imageDimensions ? JSON.parse(req.body.imageDimensions) : {};
            const { width = 0, height = 0 } = imageDimensions;
            if (width && height) {
              const ratio = width / height;
              if (Math.abs(ratio - 1) < 0.1) {
                announcementData.imageOrientation = 'SQUARE';
              } else if (ratio > 1) {
                announcementData.imageOrientation = 'LANDSCAPE';
              } else {
                announcementData.imageOrientation = 'PORTRAIT';
              }
            } else {
              announcementData.imageOrientation = 'SQUARE';
            }
          } catch (parseError) {
            announcementData.imageOrientation = 'SQUARE';
          }
        }
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading file',
          error: uploadError.message
        });
      }
    }

    const announcement = await Announcement.create(announcementData);

    // Fetch with creator details
    const fullAnnouncement = await Announcement.findByPk(announcement.id, {
      include: {
        model: User,
        as: 'Creator',
        attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage', 'approvedRole']
      }
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: fullAnnouncement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating announcement',
      error: error.message
    });
  }
};

// Update announcement - only creator or admin
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has permission to update
    if (announcement.createdBy !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this announcement'
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (type) updateData.type = type;

    // Handle file removal
    const removeFile = req.body.removeFile === 'true';
    if (removeFile && announcement.fileUrl) {
      try {
        await deleteFromS3(announcement.fileUrl);
        updateData.fileUrl = null;
        updateData.fileName = null;
        updateData.fileType = null;
        updateData.imageOrientation = null;
      } catch (deleteError) {
        console.error('Error deleting file:', deleteError);
        // Don't fail the update if deletion fails
      }
    }

    // Handle file update
    if (req.file) {
      try {
        // Delete old file if exists
        if (announcement.fileUrl) {
          await deleteFromS3(announcement.fileUrl);
        }

        const fileUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'announcements');

        updateData.fileUrl = fileUrl;
        updateData.fileName = req.file.originalname;
        updateData.fileType = req.file.mimetype;

        // Detect image orientation
        if (req.file.mimetype.startsWith('image/')) {
          try {
            const imageDimensions = req.body.imageDimensions ? JSON.parse(req.body.imageDimensions) : {};
            const { width = 0, height = 0 } = imageDimensions;
            if (width && height) {
              const ratio = width / height;
              if (Math.abs(ratio - 1) < 0.1) {
                updateData.imageOrientation = 'SQUARE';
              } else if (ratio > 1) {
                updateData.imageOrientation = 'LANDSCAPE';
              } else {
                updateData.imageOrientation = 'PORTRAIT';
              }
            } else {
              updateData.imageOrientation = 'SQUARE';
            }
          } catch (parseError) {
            updateData.imageOrientation = 'SQUARE';
          }
        }
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading file',
          error: uploadError.message
        });
      }
    }

    await announcement.update(updateData);

    // Fetch updated announcement with creator details
    const updatedAnnouncement = await Announcement.findByPk(id, {
      include: {
        model: User,
        as: 'Creator',
        attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage', 'approvedRole']
      }
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating announcement',
      error: error.message
    });
  }
};

// Delete announcement - only creator or admin
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has permission to delete
    if (announcement.createdBy !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this announcement'
      });
    }

    // Delete file from S3 if exists
    if (announcement.fileUrl) {
      try {
        const key = announcement.fileUrl.split('.com/')[1];
        await deleteFromS3(key);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    }

    await announcement.destroy();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting announcement',
      error: error.message
    });
  }
};

// Archive announcement
exports.archiveAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has permission to archive
    if (announcement.createdBy !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to archive this announcement'
      });
    }

    await announcement.update({ status: 'ARCHIVED' });

    res.json({
      success: true,
      message: 'Announcement archived successfully',
      data: announcement
    });
  } catch (error) {
    console.error('Error archiving announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving announcement',
      error: error.message
    });
  }
};
