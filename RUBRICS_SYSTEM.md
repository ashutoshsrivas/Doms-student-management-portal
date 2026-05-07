# Assessment Rubrics System

## Overview
A comprehensive rubrics-based grading system that allows instructors to:
- Create custom rubrics for assessments
- Define grading criteria with point values
- Grade submissions using rubrics without requiring student responses
- Support both question-specific and general assessment criteria

## Database Schema

### New Models

#### 1. **Rubric**
- `id` (UUID, primary key)
- `assessmentId` (UUID, foreign key) - Links to Assessment
- `name` (String) - Rubric title
- `description` (Text) - Rubric description
- `totalPoints` (Decimal) - Sum of all criteria max points
- `createdBy` (UUID, foreign key) - Instructor who created it
- Timestamps (createdAt, updatedAt)

#### 2. **RubricCriteria**
- `id` (UUID, primary key)
- `rubricId` (UUID, foreign key) - Links to Rubric
- `questionId` (UUID, foreign key, optional) - Can be linked to a specific question or general
- `criteriaName` (String) - Criterion title (e.g., "Clarity", "Accuracy", "Completeness")
- `description` (Text) - Detailed description of the criterion
- `maxPoints` (Decimal) - Maximum points for this criterion
- `orderIndex` (Integer) - Display order
- Timestamps

#### 3. **RubricScore**
- `id` (UUID, primary key)
- `submissionId` (UUID, foreign key) - Links to AssessmentSubmission
- `rubricCriteriaId` (UUID, foreign key) - Links to RubricCriteria
- `score` (Decimal) - Points awarded for this criterion
- `feedback` (Text) - Grader's feedback for this criterion
- Timestamps

## API Endpoints

### Rubric Management

#### Create Rubric
```
POST /api/rubrics
{
  "assessmentId": "uuid",
  "name": "Essay Rubric",
  "description": "Grading criteria for essay submissions",
  "totalPoints": 100,
  "criteria": [
    {
      "criteriaName": "Content Quality",
      "description": "Depth and accuracy of content",
      "maxPoints": 40,
      "orderIndex": 0
    },
    {
      "criteriaName": "Organization",
      "description": "Logical flow and structure",
      "maxPoints": 30,
      "orderIndex": 1
    },
    {
      "criteriaName": "Writing Quality",
      "description": "Grammar, spelling, clarity",
      "maxPoints": 30,
      "orderIndex": 2
    }
  ]
}
```

#### Get Rubrics for Assessment
```
GET /api/rubrics/assessment/:assessmentId
```
Returns all rubrics for an assessment with their criteria.

#### Get Single Rubric
```
GET /api/rubrics/:rubricId
```
Returns detailed rubric information including all criteria and associated questions.

#### Update Rubric
```
PUT /api/rubrics/:rubricId
{
  "name": "Updated Rubric Name",
  "description": "Updated description",
  "totalPoints": 100
}
```

#### Delete Rubric
```
DELETE /api/rubrics/:rubricId
```

### Rubric Criteria Management

#### Add Criteria
```
POST /api/rubrics/:rubricId/criteria
{
  "criteriaName": "Creativity",
  "description": "Originality and innovative thinking",
  "maxPoints": 20,
  "questionId": "optional-question-uuid",
  "orderIndex": 3
}
```

#### Update Criteria
```
PUT /api/rubrics/criteria/:criteriaId
{
  "criteriaName": "Updated Criterion",
  "description": "Updated description",
  "maxPoints": 25,
  "questionId": "optional-uuid",
  "orderIndex": 0
}
```

#### Delete Criteria
```
DELETE /api/rubrics/criteria/:criteriaId
```
Automatically recalculates rubric's totalPoints.

### Grading Operations

#### Grade Submission with Rubric
```
POST /api/rubrics/submissions/:submissionId/grade-with-rubric
{
  "rubricScores": [
    {
      "rubricCriteriaId": "criteria-uuid",
      "score": 38,
      "feedback": "Excellent content with minor gaps"
    },
    {
      "rubricCriteriaId": "criteria-uuid-2",
      "score": 28,
      "feedback": "Good organization, could be more logical"
    },
    {
      "rubricCriteriaId": "criteria-uuid-3",
      "score": 30,
      "feedback": "Excellent grammar and clarity"
    }
  ]
}
```
- Creates RubricScore records for each criterion
- Calculates total score from all criteria
- Updates submission status to GRADED
- Records grader ID and timestamp

#### Get Submission Rubric Scores
```
GET /api/rubrics/submissions/:submissionId/rubric-scores
```
Returns all rubric scores for a submission with:
- Score breakdown by criterion
- Feedback for each criterion
- Total score
- Associated questions (if applicable)

## Use Cases

### 1. **Essay/Long-form Assignments**
Create rubrics with criteria like:
- Content Quality
- Organization
- Writing Quality
- Originality

### 2. **Presentations**
Rubric criteria:
- Content Delivery
- Visual Aids
- Audience Engagement
- Time Management

### 3. **Projects**
Rubric criteria:
- Functionality
- Code Quality
- Documentation
- Testing

### 4. **No-Response Assessments**
Grade assignments without student responses:
- Attendance-based grading
- Participation marks
- Group work assessment
- Practical/Lab work evaluation

## Features

✅ **Flexible Criteria** - Define custom criteria per assessment
✅ **Question-Specific** - Link criteria to specific questions or keep general
✅ **No Responses Required** - Grade assessments with zero student responses
✅ **Automatic Total Calculation** - Points automatically sum from criteria
✅ **Granular Feedback** - Provide feedback for each criterion
✅ **Authorization** - Only assessment creator or admin can grade
✅ **Flexible Scoring** - Award fractional points (decimals) per criterion

## Workflow Example

1. **Create Assessment** with no or some questions
2. **Create Rubric** with custom criteria and point values
3. **Assign Assessment** to students
4. **Grade Submission** using rubric:
   - For each criterion, enter score and feedback
   - System calculates total automatically
   - Submission marked as GRADED
5. **View Results** with detailed rubric breakdown

## Future Enhancements
- Rubric templates for reuse across assessments
- Weighted scoring (some criteria worth more than others)
- Rubric descriptions/guidelines for each score level
- Batch grading interface
- Grading analytics and statistics
