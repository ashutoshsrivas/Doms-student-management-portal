# Profile Management System

## Overview

The DOMS profile management system allows users to manage their personal details, upload profile images, and maintain their professional information. The system consists of two main profile pages: a general user profile and a student-specific profile.

## Components

### 1. General User Profile (`/app/profile/page.tsx`)

**Accessible By**: All authenticated users

**Features**:
- **Profile Information Display**
  - User name with initials avatar
  - Email address
  - Role and status badges
  - Registration number (if applicable)
  - Employee ID (if applicable)

- **Profile Image Management**
  - Click camera icon to upload new image
  - Image preview with fallback to initials
  - Automatic base64 encoding for storage
  - Validation: File type (image only) and size (max 5MB)

- **Personal Details Editing**
  - First Name (required)
  - Last Name (required)
  - Phone Number (10-digit validation)
  - Department (optional)
  - Save changes button with loading state
  - Reset button to revert changes

**Validation Rules**:
```
- First Name: Required, non-empty string
- Last Name: Required, non-empty string
- Phone Number: Optional, must be 10 digits if provided
- Department: Optional, any string value
- Profile Image: Optional, image files only, max 5MB
```

**API Integration**:
- `GET /auth/profile` - Fetch current user profile
- `PUT /auth/profile` - Update profile information

### 2. Student Profile (`/app/student/profile/page.tsx`)

**Accessible By**: STUDENT role users only

**Features**:
- **Tab Navigation**
  - Overview: Bio and personal description
  - Achievements: List and manage accomplishments
  - Skills: Display technical and soft skills
  - Interests: Show professional interests

- **Bio Section**
  - Free-text area for personal bio
  - Save bio functionality

- **Achievements**
  - Display list of achievements
  - Add new achievement button
  - Each achievement shows: title, description, date
  - Empty state with call-to-action

- **Skills & Interests**
  - Skills displayed as blue tags
  - Interests displayed as green tags
  - Edit functionality
  - Empty state messages

**Placeholders for Future Features**:
- Resume Builder link
- Portfolio Management link

## Usage Guide

### Updating Profile

1. **Navigate to Profile**
   ```
   /profile - For general user profile
   /student/profile - For student-specific profile
   ```

2. **Upload Profile Image**
   - Click the camera icon on the profile avatar
   - Select an image file (JPEG, PNG, WebP, etc.)
   - Image preview updates automatically
   - Image is encoded as base64 for storage

3. **Edit Personal Details**
   - Modify first name, last name, phone, or department
   - Phone number must be 10 digits
   - Click "Save Changes" to submit
   - Click "Reset" to discard changes

4. **Success Notification**
   - Toast message confirms successful profile update
   - Profile page automatically refreshes with new data

### Student Profile Features

1. **Add Bio**
   - Click in the bio text area
   - Type your professional bio
   - Click "Save Bio" to store

2. **Manage Achievements**
   - Click "Add Achievement" button
   - Enter title, description, and date
   - Achievements display in chronological order

3. **Edit Skills & Interests**
   - Click "Edit" button
   - Add/remove skills and interests
   - Save changes

## Technical Details

### Frontend Stack
- Next.js 16.2.4 with React 19
- TypeScript for type safety
- Tailwind CSS for styling
- react-icons/fi for icons
- react-hot-toast for notifications

### State Management
- Zustand for authentication state
- Local component state for form data
- Automatic token refresh on 403 responses

### Image Handling
- Client-side base64 encoding
- File type validation (image/* only)
- Size validation (max 5MB)
- PNG, JPEG, WebP support

### Error Handling
- Form validation with error messages
- API error handling with toast notifications
- Loading states during API calls
- Fallback UI for failed profile loads

## Backend Requirements

### Endpoints Used

1. **Get Profile**
   ```
   GET /auth/profile
   Headers: Authorization: Bearer <token>
   Response: User object with all fields
   ```

2. **Update Profile**
   ```
   PUT /auth/profile
   Headers: Authorization: Bearer <token>
   Body: {
     firstName?: string,
     lastName?: string,
     phoneNumber?: string,
     department?: string,
     profileImage?: string (base64)
   }
   Response: { message, user }
   ```

## Environment Configuration

Ensure `.env.local` contains:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Future Enhancements

1. **Image Upload to Cloud Storage**
   - Replace base64 with AWS S3 upload
   - Implement multipart form data
   - Add image cropping/resize

2. **Achievements Management**
   - Backend CRUD endpoints
   - Achievement categories
   - Skill endorsements
   - Achievement verification

3. **Resume Builder**
   - Integrated resume creation
   - Multiple template options
   - PDF/DOCX export
   - Template preview

4. **Portfolio System**
   - Project showcase
   - Work samples
   - Live project links
   - Project descriptions

5. **Profile Completeness**
   - Completion percentage indicator
   - Suggestions for missing fields
   - Profile visibility settings

6. **Social Integration**
   - LinkedIn profile import
   - GitHub profile link
   - Portfolio website link

## Troubleshooting

### Profile Won't Load
- Verify user is authenticated
- Check API token in cookies
- Ensure backend is running on port 4000

### Image Upload Failed
- Check file size (max 5MB)
- Verify file is an image
- Check browser console for errors

### Profile Update Not Saved
- Verify internet connection
- Check backend response in Network tab
- Look for validation errors in toast message

### Profile Image Not Showing
- Clear browser cache
- Check if base64 string is valid
- Verify image URL/path in backend

## Security Considerations

- Profile image stored as base64 in database (consider S3 for production)
- Require authentication for profile access
- Validate phone number format
- Sanitize text inputs before display
- Use HTTPS in production

## Performance Notes

- Profile data fetched once on page load
- Image preview generated client-side
- Debounce form changes for better UX
- Consider pagination for large datasets (achievements)

## Support

For issues or questions about profile management:
1. Check backend logs for API errors
2. Review browser console for client errors
3. Verify database contains user record
4. Check token validity in browser cookies
