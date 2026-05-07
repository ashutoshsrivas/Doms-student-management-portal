# DOMS - Student Management System

A comprehensive, role-based student management and profile system built for educational institutions.

## Features

- **Multi-Role System**: Support for Admin, HOD, Faculty, Students, Trainers, Coordinators, and Mentors
- **Student Profiles**: Complete profile management with photos, achievements, and professional information
- **Dynamic Assessments**: Create flexible assessments with text and multimedia answers
- **Session Management**: Manage academic sessions and onboard students
- **Resume Generation**: Export student profiles as resumes in customizable formats
- **Secure Messaging**: Role-based chat system for student-faculty communication
- **JWT Authentication**: Secure token-based authentication
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database with Sequelize ORM
- **JWT** for authentication
- **AWS S3** for file uploads
- **Socket.io** for real-time messaging

### Frontend
- **Next.js 16** with React 19
- **TypeScript**
- **TailwindCSS** for styling
- **Zustand** for state management
- **Axios** for API calls
- **Socket.io Client** for real-time features

## Project Structure

```
doms/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Entry point
│   │   ├── config/
│   │   │   └── database.js         # Database configuration
│   │   ├── models/
│   │   │   └── index.js            # Sequelize models
│   │   ├── routes/
│   │   │   ├── authRoutes.js       # Authentication endpoints
│   │   │   ├── userRoutes.js       # User management endpoints
│   │   │   └── sessionRoutes.js    # Session management endpoints
│   │   ├── controllers/
│   │   │   ├── authController.js   # Auth logic
│   │   │   ├── userController.js   # User logic
│   │   │   └── sessionController.js # Session logic
│   │   └── middleware/
│   │       ├── auth.js             # JWT middleware
│   │       └── errorHandler.js     # Error handling
│   ├── .env                         # Environment variables
│   └── package.json
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/page.tsx       # Login page
    │   │   ├── signup/page.tsx      # Signup page
    │   │   └── pending/page.tsx     # Pending approval page
    │   ├── admin/
    │   │   └── dashboard/page.tsx   # Admin dashboard
    │   ├── student/
    │   │   └── dashboard/page.tsx   # Student dashboard
    │   ├── components/
    │   │   ├── DashboardLayout.tsx  # Dashboard layout
    │   │   └── ProtectedRoute.tsx   # Route protection
    │   ├── store/
    │   │   └── authStore.js         # Auth state management
    │   ├── lib/
    │   │   └── apiClient.js         # API client with interceptors
    │   ├── layout.tsx               # Root layout
    │   └── page.tsx                 # Landing page
    ├── .env.local                   # Environment variables
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**
   Update `.env` with your database credentials:
   ```env
   PORT=4000
   FRONTEND_ORIGIN=https://localhost:3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=doms
   DB_PORT=3306
   JWT_SECRET=your-secret-key-change-in-production
   AWS_REGION=ap-south-1
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   S3_BUCKET=your-bucket
   S3_PREFIX=uploads/doms/
   ```

3. **Create MySQL database**
   ```sql
   CREATE DATABASE doms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```
   Backend will run on `http://localhost:4000`

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**
   Update `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:3000`

## User Roles & Permissions

### Admin
- Manage all users
- Approve/reject signup requests
- Create and manage academic sessions
- View system reports
- Configure system settings

### HOD (Head of Department)
- Manage students in their department
- Create and manage assessments
- Export student profiles as resumes
- View department reports

### Faculty
- Create assessments
- View assigned students
- Grade student assessments
- Send messages to students

### Student
- Complete profile setup
- Upload achievements and profile photo
- Attempt assessments
- Download resume
- Message faculty and mentors

### Trainer
- Manage assigned students
- Create assessments
- Track student progress

### Coordinator & Placement Coordinator
- Manage events and sessions
- Coordinate placement activities
- Send communications

### Mentor
- Guide students
- Conduct assessments
- Provide feedback

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Admin Only
- `GET /api/auth/pending-requests` - Get pending signup requests
- `POST /api/auth/approve-user` - Approve user signup
- `POST /api/auth/reject-user` - Reject user signup

### User Management
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/search/query` - Search users
- `PUT /api/users/:userId/role` - Update user role (admin only)
- `PUT /api/users/:userId/deactivate` - Deactivate user (admin only)

### Session Management
- `POST /api/sessions` - Create academic session (admin only)
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/:id` - Get session by ID
- `PUT /api/sessions/:sessionId` - Update session (admin only)
- `PUT /api/sessions/:sessionId/activate` - Activate session (admin only)
- `POST /api/sessions/:sessionId/students` - Onboard student (admin only)
- `GET /api/sessions/:sessionId/students` - Get session students
- `PUT /api/sessions/students/:studentSessionId/drop` - Drop student (admin only)

## Development Workflow

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## Authentication Flow

1. User signs up with email, password, and requested role
2. Account is created with `PENDING` status
3. Admin reviews pending requests
4. Admin approves and assigns appropriate role, or rejects the request
5. User can now login if approved
6. JWT token issued on successful login
7. Token included in all protected requests
8. Auto-refresh mechanism handles token expiration

## Next Steps

After basic setup, implement:

1. **Profile Management**
   - Student profile upload page
   - Photo upload with AWS S3
   - Achievement management

2. **Assessment System**
   - Assessment creation page
   - Assessment submission
   - Grading interface

3. **Chat System**
   - Real-time messaging with Socket.io
   - Notification system
   - Message history

4. **Resume Export**
   - Dynamic field selection
   - Multiple export formats (PDF, DOCX)
   - Shareable links

5. **Admin Panel**
   - User management interface
   - Session management
   - Report generation
   - System configuration

## Deployment

### Backend Deployment (Using Railway/Heroku)
1. Push code to GitHub
2. Connect repository to Railway/Heroku
3. Set environment variables
4. Deploy

### Frontend Deployment (Using Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically on push

## Environment Variables Reference

### Backend (.env)
```
PORT=4000
FRONTEND_ORIGIN=https://localhost:3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=doms
DB_PORT=3306
JWT_SECRET=dev-secret-change-me
NODE_ENV=development
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_PREFIX=uploads/doms/
S3_PUBLIC_BASE=
S3_ACL=public-read
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Troubleshooting

### Database Connection Error
- Ensure MySQL is running
- Verify database credentials in .env
- Check database exists

### Port Already in Use
- Backend: Change PORT in .env
- Frontend: Use `PORT=3001 npm run dev`

### CORS Errors
- Ensure FRONTEND_ORIGIN in backend .env matches frontend URL
- Check API client configuration

### Token Expiration
- Implement refresh token mechanism (done in authStore)
- Check JWT_SECRET consistency

## Support & Feedback

For issues, feature requests, or feedback, please contact the development team.

## License

© 2024 DOMS. All rights reserved.
