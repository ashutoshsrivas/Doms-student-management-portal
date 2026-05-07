const { StudentProfile, User } = require('../models');

const studentProfileController = {
  // Get student profile
  getStudentProfile: async (req, res) => {
    try {
      const userId = req.user.id;

      let profile = await StudentProfile.findOne({ where: { userId } });

      // If profile doesn't exist, create an empty one
      if (!profile) {
        profile = await StudentProfile.create({ userId });
      }

      res.json(profile);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  },

  // Update student profile
  updateStudentProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        fatherName,
        fatherOccupation,
        fatherOccupationDescription,
        motherName,
        motherOccupation,
        motherOccupationDescription,
        guardianPhone,
        residentialStatus,
        aboutMe,
        careerObjective,
        interests,
        skills,
        coScholasticExpertise,
        coScholasticDescription,
        hasWorkExperience,
        workExperiences,
        achievements,
        certifications,
        projects,
        positionsOfResponsibility,
        linkedin,
        github,
        portfolio,
        coursera,
        otherLinks,
        languagesKnown,
        hobbies,
        strengths,
        areasOfImprovement,
      } = req.body;

      let profile = await StudentProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await StudentProfile.create({
          userId,
          fatherName,
          fatherOccupation,
          fatherOccupationDescription,
          motherName,
          motherOccupation,
          motherOccupationDescription,
          guardianPhone,
          residentialStatus,
          aboutMe,
          careerObjective,
          interests: interests || [],
          skills: skills || [],
          coScholasticExpertise,
          coScholasticDescription,
          hasWorkExperience,
          workExperiences: workExperiences || [],
          achievements: achievements || [],
          certifications: certifications || [],
          projects: projects || [],
          positionsOfResponsibility: positionsOfResponsibility || [],
          linkedin,
          github,
          portfolio,
          coursera,
          otherLinks: otherLinks || [],
          languagesKnown: languagesKnown || [],
          hobbies: hobbies || [],
          strengths: strengths || [],
          areasOfImprovement: areasOfImprovement || [],
        });
      } else {
        await profile.update({
          fatherName,
          fatherOccupation,
          fatherOccupationDescription,
          motherName,
          motherOccupation,
          motherOccupationDescription,
          guardianPhone,
          residentialStatus,
          aboutMe,
          careerObjective,
          interests: interests || profile.interests,
          skills: skills || profile.skills,
          coScholasticExpertise,
          coScholasticDescription,
          hasWorkExperience,
          workExperiences: workExperiences || profile.workExperiences,
          achievements: achievements || profile.achievements,
          certifications: certifications || profile.certifications,
          projects: projects || profile.projects,
          positionsOfResponsibility: positionsOfResponsibility || profile.positionsOfResponsibility,
          linkedin,
          github,
          portfolio,
          coursera,
          otherLinks: otherLinks || profile.otherLinks,
          languagesKnown: languagesKnown || profile.languagesKnown,
          hobbies: hobbies || profile.hobbies,
          strengths: strengths || profile.strengths,
          areasOfImprovement: areasOfImprovement || profile.areasOfImprovement,
        });
      }

      res.json({ message: 'Profile updated successfully', profile });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  },

  // Add to array field (skills, interests, etc.)
  addArrayItem: async (req, res) => {
    try {
      const userId = req.user.id;
      const { field, item } = req.body;

      if (!field || !item) {
        return res.status(400).json({ message: 'Field and item are required' });
      }

      const profile = await StudentProfile.findOne({ where: { userId } });

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const currentArray = profile[field] || [];
      if (!Array.isArray(currentArray)) {
        return res.status(400).json({ message: `${field} is not an array field` });
      }

      currentArray.push(item);
      await profile.update({ [field]: currentArray });

      res.json({ message: 'Item added successfully', profile });
    } catch (error) {
      console.error('Add item error:', error);
      res.status(500).json({ message: 'Failed to add item' });
    }
  },

  // Remove from array field
  removeArrayItem: async (req, res) => {
    try {
      const userId = req.user.id;
      const { field, index } = req.body;

      if (!field || index === undefined) {
        return res.status(400).json({ message: 'Field and index are required' });
      }

      const profile = await StudentProfile.findOne({ where: { userId } });

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const currentArray = profile[field] || [];
      if (!Array.isArray(currentArray)) {
        return res.status(400).json({ message: `${field} is not an array field` });
      }

      currentArray.splice(index, 1);
      await profile.update({ [field]: currentArray });

      res.json({ message: 'Item removed successfully', profile });
    } catch (error) {
      console.error('Remove item error:', error);
      res.status(500).json({ message: 'Failed to remove item' });
    }
  },
};

module.exports = studentProfileController;
