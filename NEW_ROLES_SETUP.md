# New User Roles Setup

## Overview
Three new user roles have been created: **Faculty**, **Placement Coordinator**, and **Trainer**. These roles have the same assessment management capabilities as Admin but with restricted access.

## Setup Instructions

### 1. Create Test Users

Run this command in the backend directory to create test users:
```bash
cd /Users/ashutosh/Desktop/development/doms/backend
node create-users.js
```

This creates:
- **Faculty**: faculty@example.com / Faculty@123
- **Placement Coordinator**: coordinator@example.com / Coordinator@123
- **Trainer**: trainer@example.com / Trainer@123

### 2. Features Available to These Roles

✅ **What They CAN Do:**
- Create assessments
- View and edit ONLY their own created assessments
- Create rubrics and grading criteria
- Grade student submissions
- View results and export CSV reports
- Create questions and manage assessment content
- Assign assessments to sessions
- View and manage student submissions

❌ **What They CANNOT Do:**
- Manage users (no Users section)
- Manage academic sessions (no Sessions section)
- See assessments created by other Faculty/Coordinators/Trainers
- Access administrative features

## Architecture

### Backend Changes
- **assessmentController.js**: Added authorization check so FACULTY, PLACEMENT_COORDINATOR, and TRAINER users only see assessments where `createdBy === userId`
- **create-users.js**: Script to create test users with proper roles and status

### Frontend Changes
- **DashboardLayout.tsx**: Updated navigation to show role-specific menu items
- **New directories created**:
  - `/frontend/app/faculty/` - Faculty-specific pages
  - `/frontend/app/coordinator/` - Coordinator-specific pages
  - `/frontend/app/trainer/` - Trainer-specific pages

- **New pages**:
  - Faculty Dashboard: `/faculty/dashboard`
  - Faculty Assessments: `/faculty/assessments` (redirects to admin assessments)
  - Coordinator Dashboard: `/coordinator/dashboard`
  - Coordinator Assessments: `/coordinator/assessments` (redirects to admin assessments)
  - Trainer Dashboard: `/trainer/dashboard`
  - Trainer Assessments: `/trainer/assessments` (redirects to admin assessments)

## How It Works

1. **Login**: User logs in with their role (FACULTY, PLACEMENT_COORDINATOR, or TRAINER)
2. **Dashboard**: Sees a dashboard with quick access to their assessments
3. **Create Assessment**: Navigate to Assessments and create a new assessment
4. **Manage**: Can only see and edit assessments they created
5. **No Access**: Cannot see user management or session management

## Testing

### Test Faculty User
```
Email: faculty@example.com
Password: Faculty@123
URL: http://localhost:3000/faculty/dashboard
```

### Test Coordinator User
```
Email: coordinator@example.com
Password: Coordinator@123
URL: http://localhost:3000/coordinator/dashboard
```

### Test Trainer User
```
Email: trainer@example.com
Password: Trainer@123
URL: http://localhost:3000/trainer/dashboard
```

## Key Implementation Details

### Assessment Filtering
When these users fetch assessments, the backend automatically filters results:
```javascript
if (['FACULTY', 'PLACEMENT_COORDINATOR', 'TRAINER'].includes(userRole)) {
  where.createdBy = userId;
}
```

### Role-Based Navigation
The dashboard navigation automatically adjusts based on user role:
```javascript
FACULTY: [
  { name: 'Dashboard', href: '/faculty/dashboard' },
  { name: 'Assessments', href: '/faculty/assessments' },
  { name: 'Profile', href: '/profile' }
]
```

### Authorization Checks
All role pages include authorization checks:
```typescript
if (user && user.role !== 'FACULTY') {
  router.push('/unauthorized');
}
```

## Next Steps

You can further customize by:
1. Creating role-specific assessment templates
2. Adding role-specific validation rules
3. Implementing role-specific reporting features
4. Creating batch operations for coordinators
5. Adding supervisor/HOD approval workflows
