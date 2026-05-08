# AI Job Matching Feature - Setup Guide

## Overview
The AI Job Matching feature allows Placement Coordinators to upload job descriptions and automatically match them with the most relevant students from the database based on skills, experience, achievements, resume, projects, and certifications.

## Features
- ✅ AI-powered student matching using Gemini API
- ✅ Top 10 matched students ranked by relevance score
- ✅ Detailed reasoning for each match including key strengths and gap areas
- ✅ Full student profile viewing with all professional information
- ✅ Easily swappable LLM providers (currently Gemini, easy to add OpenAI/Claude)
- ✅ Role-based access control (PLACEMENT_COORDINATOR only)

## Installation Steps

### 1. Backend Setup

#### Step 1.1: Install Required Package
```bash
cd backend
npm install @google/generative-ai
```

#### Step 1.2: Add Gemini API Key to .env
Get your Gemini API key from: https://makersuite.google.com/app/apikey

Add to `backend/.env`:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
LLM_PROVIDER=gemini
```

#### Step 1.3: Verify Backend Routes
The following endpoints have been added:
- `POST /api/job-matching/match` - Match students to job description
- `GET /api/job-matching/student/:studentId` - Get student details for display

### 2. Frontend Updates
The following new pages and components have been added:
- `/coordinator/job-matching` - Main job matching interface
- Updated coordinator dashboard with Job Matching card
- Updated sidebar with Job Matching navigation link

### 3. How to Use

#### For Placement Coordinators:
1. Navigate to **Dashboard** → **Job Matching** (or use sidebar)
2. Paste the job description in the left panel
   - Include: Job title, responsibilities, required skills, experience level, qualifications
3. Click "Find Matches"
4. Review the top 10 matched students
5. Click "View Full Profile" to see detailed information about a student
6. Use the information to contact and schedule interviews with promising candidates

## Technical Implementation

### Backend Architecture

#### Job Matching Controller (`backend/src/controllers/jobMatchingController.js`)

**Key Functions:**
- `analyzeStudentJobMatch()` - Analyzes individual student vs job using LLM
- `matchStudentsToJob()` - Main endpoint that orchestrates the matching process
- `getStudentDetails()` - Fetches detailed student profile for display

**LLM Service Design:**
The code uses a provider-agnostic approach making it easy to swap providers:

```javascript
// Current: Gemini
const llmService = initializeLLMService(); // Uses Gemini by default

// To add OpenAI support in future:
if (provider === 'openai') {
  return {
    provider: 'openai',
    model: openai.getModel('gpt-4'),
  };
}
```

**Student Data Used for Matching:**
- Skills (array)
- Work Experience (company, position, duration, description)
- Achievements (array)
- Projects (title, description)
- Certifications (array)
- Resume (file path/URL)
- Career Objective (text)
- About Me (text)
- Department
- Registration Number

### Frontend Architecture

#### Job Matching Page (`frontend/app/coordinator/job-matching/page.tsx`)

**Components:**
- **Left Panel**: Job description input form
- **Right Panel**: Results display with:
  - Ranked student matches (1-10)
  - Match score (0-100)
  - AI reasoning for each match
  - Key strengths and gap areas
  - View full profile modal

**Functionality:**
- Real-time job description input
- Loading states and error handling
- Student detail modal with complete profile information
- Responsive design for mobile and desktop
- Toast notifications for user feedback

## API Response Format

### POST /api/job-matching/match
```json
{
  "success": true,
  "data": {
    "jobDescription": "Software Engineer - Full Stack...",
    "totalStudentsAnalyzed": 150,
    "topMatches": [
      {
        "matchScore": 92,
        "reasoning": "Excellent match with strong full-stack experience...",
        "keyStrengths": [
          "React and Node.js expertise",
          "Database design experience",
          "Team collaboration skills"
        ],
        "gapAreas": [
          "Limited AWS cloud experience"
        ],
        "studentId": "uuid",
        "studentName": "John Doe",
        "studentEmail": "john@example.com"
      },
      // ... more matches
    ]
  },
  "message": "Successfully matched 10 students to the job"
}
```

### GET /api/job-matching/student/:studentId
```json
{
  "success": true,
  "data": {
    "personalInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+91-XXXXX",
      "department": "Computer Science",
      "registrationNumber": "CS001",
      "profileImage": "url"
    },
    "profile": {
      "skills": ["React", "Node.js", "MongoDB"],
      "workExperiences": [...],
      "achievements": [...],
      "projects": [...],
      "certifications": [...],
      "careerObjective": "...",
      "aboutMe": "..."
    }
  }
}
```

## Customization Options

### 1. Changing LLM Provider

To use OpenAI instead of Gemini:

```javascript
// In jobMatchingController.js - Update initializeLLMService()
if (provider === 'openai') {
  const OpenAI = require('openai').default;
  const openai = new OpenAI(process.env.OPENAI_API_KEY);
  return {
    provider: 'openai',
    model: 'gpt-4',
    client: openai,
  };
}
```

Update `.env`:
```
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
```

### 2. Changing Top N Results
In `backend/src/controllers/jobMatchingController.js`, line ~145:
```javascript
.slice(0, 10); // Change 10 to desired number
```

### 3. Adjusting Matching Criteria
Edit the LLM prompt in `analyzeStudentJobMatch()` function to emphasize different factors or adjust the scale.

## Performance Considerations

- **API Rate Limiting**: Gemini API has rate limits. For large batches of students (100+), consider implementing pagination or background job processing.
- **Response Time**: Matching 100 students takes ~30-60 seconds depending on API response times.
- **Caching**: Consider caching student profiles to avoid repeated database queries.

## Error Handling

The system handles several error scenarios:
1. Missing job description → 400 Bad Request
2. No active students found → 404 Not Found
3. LLM service not configured → 500 Internal Server Error
4. LLM API failure → Returns default response with error flag

Failed individual analyses are filtered out and excluded from results.

## Security

- ✅ Role-based access control: Only PLACEMENT_COORDINATOR can access
- ✅ Token-based authentication required for all endpoints
- ✅ Student data is only returned to authorized coordinators
- ✅ No sensitive data (passwords, etc.) is exposed
- ✅ Environment variables protect API keys

## Future Enhancements

1. **Job History**: Store submitted jobs and results for future reference
2. **Batch Processing**: Handle large numbers of students with background jobs
3. **Multiple LLM Providers**: Support OpenAI, Claude, Local LLMs
4. **Custom Scoring**: Allow coordinators to weight criteria (skills 40%, experience 30%, etc.)
5. **Export Results**: Download matched students as PDF or CSV
6. **Interview Scheduling**: Integrated calendar system
7. **Feedback Loop**: Track which students get hired to improve matching algorithm
8. **Real-time Updates**: WebSocket support for live updates on matching progress

## Troubleshooting

### Issue: "LLM service not configured"
**Solution**: Ensure GEMINI_API_KEY is set in `.env` file

### Issue: Matching takes too long
**Solution**: This is normal for 100+ students. Consider implementing pagination or background processing.

### Issue: Low match scores for all students
**Solution**: Refine the job description with more specific details about required skills and experience.

### Issue: Students missing from results
**Solution**: Ensure students have:
- Status = ACTIVE
- requestedRole = STUDENT
- Complete profile information filled in
