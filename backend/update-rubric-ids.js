const models = require('./src/models');
const { sequelize } = require('./src/config/database');

(async () => {
  try {
    // Get the first rubric 
    const rubric = await models.Rubric.findOne();
    
    if (!rubric) {
      console.log('No rubrics found.');
      process.exit(1);
    }
    
    // Update all GRADED submissions to have the rubricId
    const result = await models.AssessmentSubmission.update(
      { rubricId: rubric.id },
      { where: { status: 'GRADED' } }
    );
    
    console.log(`Updated ${result[0]} graded submissions with rubricId: ${rubric.id}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
