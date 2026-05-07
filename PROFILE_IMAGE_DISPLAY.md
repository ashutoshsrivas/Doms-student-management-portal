# Profile Image Display System

## Overview
The DOMS application now displays user profile images throughout the interface wherever user information is shown. Images are stored in AWS S3 and displayed efficiently in various components.

## Where Profile Images Are Displayed

### 1. **Dashboard Layout - Sidebar User Section**
- Location: Left sidebar in authenticated views
- Display: 12x12px avatar with user initials as fallback
- Updates: Automatically fetches latest profile image on component mount
- Shows user's first and last name next to avatar

### 2. **Dashboard Layout - Header Profile Dropdown**
- Location: Top-right corner of header in authenticated views
- Display: 8x8px profile picture in top bar, expanded to 12x12px in dropdown menu
- Shows user's full profile with email in dropdown
- Updated menu layout displays profile image prominently

### 3. **Profile Page**
- Location: `/profile` - User's personal profile management page
- Display: Large 32x32px profile image with upload button
- Features:
  - Click camera icon to upload new image
  - Auto-generates initials as placeholder if no image
  - Displays image preview before saving
  - Automatically updates after successful upload

### 4. **Admin Dashboard - Pending Requests Table**
- Location: Admin dashboard pending user requests section
- Display: 10x10px profile image next to user name
- Shows initials as fallback if no image exists yet
- Helps admins identify users visually when approving/rejecting

## Technical Implementation

### Frontend Components Updated

#### **DashboardLayout.tsx**
```typescript
// Fetches user profile on mount to get latest image
useEffect(() => {
  const fetchUserProfile = async () => {
    const response = await apiClient.get('/auth/profile');
    setProfileImage(response.data.profileImage);
  };
}, [user, setUser]);
```

- Sidebar displays profile image with fallback initials
- Header profile dropdown shows larger version
- Uses gradient background (blue-400 to blue-600) for fallback

#### **profile/page.tsx**
- Displays large profile image for editing
- Supports file upload with S3 integration
- Updates auth store on successful upload
- Profile image displayed immediately after upload

#### **admin/dashboard/page.tsx**
- Admin table shows user profile images
- Visual identification of pending users
- Consistent styling with other components

### Fallback Behavior
All profile image displays include fallback mechanisms:
- **Primary**: Display image from `profileImage` URL
- **Fallback**: Generate initials (first letter of first name + first letter of last name)
- **Background**: Gradient (blue-400 to blue-600)
- **Text**: White, bold, uppercase initials

### Image Sizes
- **Sidebar user section**: 48x48px (w-12 h-12)
- **Header dropdown avatar**: 32x32px (w-8 h-8)
- **Dropdown menu display**: 48x48px (w-12 h-12)
- **Table display**: 40x40px (w-10 h-10)
- **Profile page**: 128x128px (w-32 h-32)

## API Endpoints Involved

### Get Profile
```
GET /api/auth/profile
Authorization: Bearer <token>
```
Returns user data including `profileImage` URL

### Login
```
POST /api/auth/login
```
Response includes `user.profileImage` URL

### Update Profile
```
PUT /api/auth/profile
Content-Type: multipart/form-data
Body:
  - firstName
  - lastName
  - phoneNumber
  - department
  - profileImage (file)
```
Returns updated user with S3 URL for new image

## State Management

### Zustand Auth Store
```typescript
// User object now includes profileImage
user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  role: string;
  status: string;
}
```

**Key Update**: After profile image upload, auth store is updated:
```typescript
setUser({
  ...user,
  profileImage: response.data.user.profileImage
});
```

This ensures:
- All components using auth store get updated image
- Profile image persists across navigation
- Logout clears profile image from store

## S3 Integration

### Image Upload Process
1. User selects image via file input
2. Frontend creates preview (local, not sent to server)
3. FormData sent to backend with image file
4. Backend validates and uploads to S3
5. S3 URL returned and stored in database
6. URL sent back to frontend
7. Frontend updates auth store and UI

### Image Storage
- **Bucket**: `rpms.geu.ac.in`
- **Region**: `ap-south-1`
- **Path**: `uploads/doms/profiles/[uuid]-[timestamp].[ext]`
- **ACL**: `public-read`
- **URL Format**: `https://s3.ap-south-1.amazonaws.com/rpms.geu.ac.in/uploads/doms/profiles/...`

### Image Deletion
When user uploads a new image:
1. Old S3 image URL retrieved from database
2. Object deleted from S3 bucket
3. Database updated with new URL
4. Error in deletion doesn't fail the operation

## User Experience Flow

### On First Login
1. User logs in
2. `profileImage` field is null/undefined
3. Components display initials as avatar
4. User sees own profile page

### After Uploading Image
1. User clicks camera icon on profile page
2. Selects image file
3. Image preview shown locally (not sent yet)
4. User clicks Save Profile button
5. Image uploaded to S3
6. Response received with S3 URL
7. Auth store updated
8. Avatar immediately updated in all components:
   - Sidebar refreshes to show image
   - Header dropdown refreshes to show image
   - Other users see image in tables/lists

### For Other Users
Admins see profile images of pending users in:
- Pending Requests table
- User management pages
- Any user list component

## Styling & CSS Classes

### Image Container Classes
```css
/* Sidebar user image */
w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600

/* Header profile dropdown toggle */
w-8 h-8 bg-blue-500 rounded-full

/* Dropdown menu profile display */
w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600

/* Admin table user image */
w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600

/* Profile page image */
w-32 h-32 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600
```

### Image Display
All images use:
- `w-full h-full object-cover` - fills container, maintains aspect ratio
- Consistent border radius
- Gradient fallback background

## Future Enhancements

1. **Image Optimization**: Implement image resizing for different sizes
2. **Caching**: Add client-side caching to reduce API calls
3. **Compression**: Compress images before S3 upload
4. **Thumbnails**: Generate and store thumbnail versions
5. **Avatar Customization**: Allow users to choose fallback colors/styles
6. **Batch Display**: Optimize loading of multiple user images
7. **Image Cropping**: Allow users to crop before upload

## Testing Profile Image Upload

1. Navigate to `/profile` when authenticated
2. Click camera icon
3. Select an image (PNG, JPG, GIF, WebP, max 5MB)
4. Image preview shows
5. Click "Save Profile" button
6. Wait for upload success message
7. Verify image appears:
   - In sidebar
   - In header dropdown
   - In any user tables/lists
   - In admin pending requests
8. Log out and log back in
9. Verify image persists
