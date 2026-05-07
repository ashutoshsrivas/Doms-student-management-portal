# S3 Image Upload Configuration

## Overview

The profile system now uses AWS S3 for image storage instead of base64 encoding. This solves the 413 (Payload Too Large) error and provides better performance and scalability.

## Architecture

### Backend Changes

#### 1. S3 Upload Utility (`src/utils/s3Upload.js`)
- **uploadToS3**: Uploads file to S3 bucket with unique filename
- **deleteFromS3**: Deletes old image when new one is uploaded
- Handles errors gracefully without failing the operation

#### 2. Multer Middleware (`src/middleware/upload.js`)
- Accepts image files only (JPEG, PNG, WebP, GIF)
- Maximum file size: 5MB
- Stores files in memory before uploading to S3

#### 3. Updated Auth Routes (`src/routes/authRoutes.js`)
```javascript
router.put('/profile', authenticateToken, upload.single('profileImage'), authController.updateProfile);
```
- Now uses multer middleware for multipart form data
- Handles file upload before passing to controller

#### 4. Updated Auth Controller (`src/controllers/authController.js`)
- Checks if file exists in `req.file`
- Deletes old image from S3 before uploading new one
- Uploads to S3 and stores URL in database
- Returns S3 URL in response

### Frontend Changes

#### 1. Updated Profile Page (`app/profile/page.tsx`)
- **handleImageUpload**: Creates local preview only (no base64 storage)
- **handleUpdateProfile**: Uses FormData for multipart upload
- File reference kept in input element until submission
- File sent via `multipart/form-data` content type

#### 2. Removed Base64 Encoding
- No more `profileImage` in form data
- No more `base64DataURL` state management
- Significantly reduces payload size

## Environment Configuration

Ensure `.env` contains S3 credentials:
```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name
S3_PREFIX=uploads/doms/
S3_PUBLIC_BASE=https://s3.region.amazonaws.com/bucket-name
S3_ACL=public-read
```

## How It Works

### 1. User Uploads Image
```
User clicks camera icon → Selects image file → Preview shows locally
```

### 2. Form Submission
```
Frontend creates FormData:
- Appends text fields (firstName, lastName, etc.)
- Appends image file (if selected)
- Sends as multipart/form-data
```

### 3. Backend Processing
```
Multer middleware:
- Validates file type and size
- Stores in memory buffer

Auth Controller:
- Extracts file from req.file
- Deletes old image from S3 (if exists)
- Uploads new image to S3
- Returns S3 URL
- Updates database with URL
```

### 4. Response
```
Returns:
{
  message: "Profile updated successfully",
  user: {
    ...
    profileImage: "https://s3.region.amazonaws.com/bucket/path/file.jpg"
  }
}
```

## File Storage Structure

Files are stored in S3 with the following path:
```
s3://bucket-name/uploads/doms/profiles/[uuid]-[timestamp].[extension]
```

Example:
```
s3://rpms.geu.ac.in/uploads/doms/profiles/550e8400-e29b-41d4-a716-446655440000-1682500000000.jpg
```

## Image Deletion

When user uploads a new image:
1. Extracts key from old image URL
2. Sends delete request to S3
3. Old image removed from bucket
4. New image URL stored in database
5. Deletion failure doesn't fail the operation (graceful error handling)

## Performance Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Max upload size | 5MB | Unlimited (network dependent) |
| Payload size | Large (base64) | Small (file reference) |
| Storage location | Database (text blob) | S3 (object storage) |
| Request duration | Slower | Faster |
| Error code | 413 Payload Too Large | None (fixed) |

## Error Handling

### Common Issues

1. **413 Payload Too Large** (Fixed)
   - Was caused by base64 encoding
   - Now uses S3 direct upload

2. **File Upload Failed**
   - Check S3 credentials
   - Verify bucket exists and is accessible
   - Check IAM permissions

3. **Delete Old Image Failed**
   - Logged but doesn't fail operation
   - New image still uploaded successfully

## Security Considerations

1. **File Validation**
   - Only image MIME types allowed
   - File size limited to 5MB
   - Validated on both client and server

2. **S3 Configuration**
   - ACL set to public-read for accessibility
   - Use IAM roles in production
   - Store credentials securely in environment

3. **CORS Configuration**
   - S3 bucket may need CORS headers for direct uploads
   - Currently using presigned URLs (via backend)

## API Endpoint

### Update Profile with Image

**Endpoint**: `PUT /api/auth/profile`

**Authentication**: Required (Bearer token)

**Content-Type**: `multipart/form-data`

**Request Body**:
```
firstName: string (required)
lastName: string (required)
phoneNumber: string (optional, 10 digits)
department: string (optional)
profileImage: File (optional, image only, max 5MB)
```

**Response**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "9876543210",
    "department": "Engineering",
    "profileImage": "https://s3.region.amazonaws.com/bucket/path/file.jpg"
  }
}
```

**Error Responses**:
- `400`: Validation error (invalid phone number)
- `404`: User not found
- `413`: Payload too large
- `500`: Server error (S3 upload failed)

## Testing

### Manual Testing

1. Log in with admin account
2. Navigate to `/profile`
3. Click camera icon to upload image
4. See preview without sending to server
5. Update other fields
6. Click Save Changes
7. Verify image uploads to S3
8. Verify old image deleted
9. Refresh page to confirm URL persistence

### Test Cases

✓ Upload valid image (JPEG, PNG, WebP)
✓ Upload image > 5MB (should fail)
✓ Upload non-image file (should fail)
✓ Update profile without image
✓ Replace existing image
✓ Handle S3 connection error

## Future Enhancements

1. **Image Cropping**
   - Client-side crop before upload
   - Reduces file size

2. **Multiple Image Sizes**
   - Generate thumbnails
   - Store optimized versions

3. **Direct Browser Upload**
   - Presigned URLs for direct S3 upload
   - Bypass backend for large files

4. **Image Optimization**
   - Compress images on backend
   - Convert to WebP format
   - Generate responsive sizes

5. **CDN Integration**
   - Serve images through CloudFront
   - Faster delivery globally

## Dependencies

- `aws-sdk`: AWS S3 client
- `multer`: File upload middleware
- `uuid`: Generate unique filenames
- Existing React/TypeScript stack

## Troubleshooting

**Images not uploading to S3:**
- Check AWS credentials in `.env`
- Verify bucket name is correct
- Check IAM permissions
- Look at CloudWatch logs

**Old images not deleting:**
- May be due to IAM permissions
- Check S3 bucket policy
- Not critical - just duplicate files

**Profile image URL not updating:**
- Clear browser cache
- Check if S3 response is valid URL
- Look at network tab for actual response
