# DOMS - Quick Start Guide

## Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

## Installation & Setup (5 minutes)

### Step 1: Create MySQL Database
```bash
mysql -u root -p

CREATE DATABASE doms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Step 2: Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Update .env with your database credentials (already configured)
# Then start the server
npm run dev

# Server runs on http://localhost:4000
```

### Step 3: Frontend Setup (new terminal)
```bash
cd frontend

# Install dependencies
npm install

# .env.local is already configured
# Start the development server
npm run dev

# Frontend runs on http://localhost:3000
```

## Testing the System

### 1. Navigate to http://localhost:3000

### 2. Create an Account (Student Role)
- Click "Create an account"
- Fill in details: email, password (min 8 chars), name, phone, role
- Select "Student" as role
- Click "Create Account"
- You'll see "Account Pending Review" page

### 3. Approve Account (Admin)
**Important**: First, create an ADMIN account, then use it to approve other accounts

- Open another browser tab/window
- Go to http://localhost:3000
- Create account with email like `admin@example.com`
- Select "ADMIN" as role
- Complete signup

Then:
- Login with admin credentials
- You'll be taken to Admin Dashboard
- Scroll down to "Pending User Requests"
- Select a role from dropdown for the pending user
- Click "Approve"

### 4. Login as Student
- Login with the student account credentials
- You'll be redirected to Student Dashboard
- Explore the dashboard features

## API Testing (Optional)

### With Postman or curl:

**1. Signup**
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "9999999999",
    "requestedRole": "STUDENT"
  }'
```

**2. Login**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**3. Get Pending Requests (with Bearer token)**
```bash
curl -X GET http://localhost:4000/api/auth/pending-requests \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## User Roles Explained

| Role | Key Features |
|------|--------------|
| **ADMIN** | Approve users, create sessions, manage all users, view reports |
| **STUDENT** | Complete profile, attempt assessments, download resume |
| **FACULTY** | Create assessments, grade students, manage classes |
| **HOD** | Manage students, export profiles, create assessments |
| **TRAINER** | Manage students, create assessments, track progress |
| **MENTOR** | Guide students, conduct assessments, provide feedback |
| **COORDINATOR** | Manage events, coordinate activities |
| **PLACEMENT_COORDINATOR** | Manage placements, coordinate with companies |

## Key Features in Current Build

[✓] Complete JWT authentication system
[✓] Multi-role signup and admin approval workflow
[✓] Responsive dashboard layouts
[✓] Admin dashboard with pending requests management
[✓] Student dashboard with profile options
[✓] Role-based route protection
[✓] Token refresh mechanism
[✓] Database models for all entities
[✓] RESTful API endpoints
[✓] Error handling and validation

## What to Build Next

1. **Student Profile Page** - Photo upload, achievements, resume builder
2. **Assessment System** - Create, submit, and grade assessments
3. **Real-time Chat** - Socket.io integration for messaging
4. **Resume Export** - PDF/DOCX generation with custom templates
5. **Admin Panel** - Complete user and session management UI
6. **HOD Features** - Student export and profile customization

## Troubleshooting

### Backend won't start
```bash
# Check if port 4000 is in use
lsof -i :4000

# Change port in backend/.env
PORT=5000
```

### Frontend won't connect to backend
- Verify backend is running on http://localhost:4000
- Check .env.local has correct API URL
- Clear browser cache and cookies

### Database connection error
- Ensure MySQL is running
- Verify credentials in backend/.env
- Check if `doms` database exists

### Port 3000 already in use
```bash
PORT=3001 npm run dev
```

## Project Structure

```
doms/
├── backend/          # Express API server
│   ├── src/
│   │   ├── models/   # Database models
│   │   ├── routes/   # API routes
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Auth, error handling
│   │   └── config/   # Database config
│   └── .env
│
└── frontend/         # Next.js React app
    ├── app/
    │   ├── auth/     # Login/Signup pages
    │   ├── admin/    # Admin dashboard
    │   ├── student/  # Student dashboard
    │   ├── store/    # Zustand state
    │   ├── lib/      # Utilities
    │   └── components/ # Reusable components
    └── .env.local
```

## Environment Variables

### Backend (.env)
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=doms
DB_PORT=3306
JWT_SECRET=dev-secret-change-me
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Development Tips

1. **Logging in Backend**: Set `NODE_ENV=development` to see SQL queries
2. **Testing Auth**: Use browser DevTools to check stored tokens
3. **API Testing**: Use Postman or Thunder Client for API testing
4. **Database Queries**: Access MySQL directly:
   ```bash
   mysql -u root -p doms
   SHOW TABLES;
   SELECT * FROM users;
   ```

## Production Deployment

### Backend (Railway/Heroku)
1. Push to GitHub
2. Connect to Railway/Heroku
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Push to GitHub
2. Connect to Vercel
3. Set NEXT_PUBLIC_API_URL to your backend URL
4. Deploy automatically on push

## Support

For issues or questions:
1. Check the README.md for detailed documentation
2. Review the code comments
3. Check console for error messages
4. Review database schema in models/

## Next: Building Features

Once you're comfortable with the setup:
1. Create profile management page
2. Implement assessment system
3. Add chat functionality
4. Build resume export
5. Expand admin features

Happy coding! [LAUNCH]
