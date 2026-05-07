# Messaging System Implementation Guide

## Overview
A WebSocket-based real-time messaging system with role-based access control and file upload support. Allows messaging between:
- Admin ↔ Student
- Mentor ↔ Student
- Coordinator ↔ Student
- Trainer ↔ Student
- Faculty ↔ Student
- HOD ↔ Student
- **NOT** Student ↔ Student

## Backend Implementation

### Database Models

#### Message Model
```javascript
- id: UUID (primary key)
- conversationId: UUID (references Conversation)
- senderId: UUID (references User)
- recipientId: UUID (references User)
- content: TEXT (message text)
- isRead: BOOLEAN (default: false)
- readAt: DATETIME (when message was read)
- createdAt, updatedAt: DATETIME (timestamps)
```

#### MessageFile Model
```javascript
- id: UUID (primary key)
- messageId: UUID (references Message, cascade delete)
- fileName: STRING (original filename)
- fileSize: BIGINT (file size in bytes)
- fileType: STRING (MIME type)
- fileUrl: STRING (S3 URL)
- s3Key: STRING (S3 object key, optional)
- createdAt, updatedAt: DATETIME
```

#### Conversation Model
```javascript
- id: UUID (primary key)
- user1Id: UUID (first participant)
- user2Id: UUID (second participant)
- lastMessageAt: DATETIME (timestamp of last message)
- createdAt, updatedAt: DATETIME
```

### API Endpoints

#### Conversation Management
```
POST   /api/messages/conversations
       Get or create a conversation with another user
       Body: { recipientId: string }

GET    /api/messages/conversations
       Get all conversations for current user

GET    /api/messages/conversations/:conversationId/messages
       Get messages in a conversation
       Query: limit=50, offset=0
```

#### Message Operations
```
POST   /api/messages/messages
       Send a new message
       Body: { conversationId: string, content: string }

DELETE /api/messages/messages/:messageId
       Delete a message (sender only)

PUT    /api/messages/messages/:messageId/read
       Mark message as read
```

#### File Upload
```
POST   /api/messages/messages/:messageId/files
       Upload a file for a message
       Body: multipart/form-data with 'file' field
       Max size: 100MB
```

#### Statistics
```
GET    /api/messages/messages/unread/count
       Get count of unread messages
```

### WebSocket Events

#### Client → Server
```javascript
// Join a conversation
socket.emit('conversation:join', conversationId)

// Leave a conversation
socket.emit('conversation:leave', conversationId)

// Send typing indicator
socket.emit('message:typing', {
  conversationId,
  isTyping: boolean
})

// Send read receipt
socket.emit('message:read', {
  conversationId,
  messageId
})

// React to a message (optional)
socket.emit('message:react', {
  conversationId,
  messageId,
  reaction: string  // e.g., '👍', '❤️'
})
```

#### Server → Client
```javascript
// New message received
socket.on('message:new', (message: Message) => {})

// Message read
socket.on('message:read', (data: ReadReceipt) => {})

// Message deleted
socket.on('message:deleted', (data: { messageId: string }) => {})

// Typing indicator
socket.on('message:typing', (data: TypingIndicator) => {})

// User online
socket.on('user:online', (data: { userId, timestamp }) => {})

// User offline
socket.on('user:offline', (data: { userId, timestamp }) => {})
```

## Frontend Implementation

### Components

#### Messaging Component (`app/components/Messaging.tsx`)
Main messaging UI component featuring:
- Conversation list sidebar
- Message display area
- Real-time typing indicators
- Read receipts (✓ and ✓✓)
- File upload and preview
- Message reactions (emoji support)
- Auto-scrolling to latest message

Props:
```typescript
interface MessagingProps {
  currentUser: User
  onSelectConversation?: (conversation: Conversation) => void
}
```

Features:
- Real-time message updates via WebSocket
- Typing indicators while composing
- File upload with size validation (100MB limit)
- Message history pagination
- Read/unread status tracking
- Responsive design for mobile and desktop

#### Message Service (`app/lib/services/messageService.ts`)
Singleton service managing:
- WebSocket connection lifecycle
- Event emission and subscription
- Message and typing listeners
- Read receipt handling
- Automatic reconnection

```typescript
// Initialize WebSocket
messageService.initializeSocket(userId, token)

// Join/leave conversation
messageService.joinConversation(conversationId)
messageService.leaveConversation(conversationId)

// Send indicators
messageService.sendTypingIndicator(conversationId, isTyping)
messageService.sendReadReceipt(conversationId, messageId)

// Register listeners
messageService.onMessage('message:new', callback)
messageService.onTyping('message:typing', callback)
messageService.onReadReceipt('message:read', callback)

// Cleanup
messageService.disconnect()
```

### Pages

#### Messages Page (`app/messages/page.tsx`)
Protected route for accessing the messaging interface. Features:
- Role-based access control (all non-student roles + students can message)
- Authentication check
- User context initialization
- Responsive layout

## Role-Based Access Control

### Who Can Message Whom?

| Role | Can Message |
|------|------------|
| ADMIN | Students, all roles |
| HOD | Students, all roles |
| FACULTY | Students, all roles |
| COORDINATOR | Students, all roles |
| PLACEMENT_COORDINATOR | Students, all roles |
| TRAINER | Students, all roles |
| MENTOR | Students, all roles |
| STUDENT | ADMIN, HOD, FACULTY, COORDINATOR, PLACEMENT_COORDINATOR, TRAINER, MENTOR |

**BLOCKED**: Student ↔ Student messaging

## File Upload

### Supported Features
- File size limit: 100MB
- Multiple file types: PDF, images, videos, documents, spreadsheets, etc.
- Files uploaded to AWS S3
- Automatic file type detection for icons

### File Icon Mapping
- PDF: 📄
- Images: 🖼️
- Videos: 🎥
- Audio: 🎵
- Word docs: 📝
- Spreadsheets: 📊
- Presentations: 🎬
- Archives: 🗂️
- Default: 📎

## Testing the System

### 1. Backend Testing

#### Start the backend server
```bash
cd backend
npm start
```

#### Verify database models
Check that the tables are created:
- `messages`
- `message_files`
- `conversations`

#### Test REST API endpoints
```bash
# Create/get conversation
curl -X POST http://localhost:4000/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"USER_ID"}'

# Send message
curl -X POST http://localhost:4000/api/messages/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"CONV_ID","content":"Hello"}'

# Get conversations
curl -X GET http://localhost:4000/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get messages
curl -X GET "http://localhost:4000/api/messages/conversations/CONV_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Frontend Testing

#### Start the frontend dev server
```bash
cd frontend
npm run dev
```

#### Test WebSocket Connection
1. Open browser developer console (F12)
2. Navigate to `/messages` page
3. Check console for "WebSocket connected" message
4. Verify socket ID is logged

#### Test Messaging Flow
1. Log in as a mentor/trainer
2. Navigate to Messages page
3. Create a conversation with a student
4. Send a message (you should see it appear immediately)
5. Verify read receipts appear
6. Open another browser window with student account
7. Verify message appears in real-time
8. Send reply and verify mentor sees it

#### Test Typing Indicators
1. Open two browser windows (mentor and student)
2. One starts typing in the other's message box
3. Verify "typing..." animation appears in the other window

#### Test File Upload
1. Click attachment button (📎)
2. Select a file (test with various types: PDF, image, etc.)
3. Verify file appears in preview
4. Send message with file
5. Verify file appears as downloadable link in the other user's window
6. Test downloading the file

#### Test Role-Based Access
1. Log in as student account
2. Try to access `/messages` page (should work)
3. Try to start conversation with another student (should be blocked)
4. Try to start conversation with trainer/mentor (should work)
5. Log in as trainer
6. Verify can start conversation with student

### 3. WebSocket Testing

#### Using WebSocket Client
```javascript
// In browser console
const socket = io('http://localhost:4000', {
  auth: { userId: 'YOUR_USER_ID', token: 'YOUR_TOKEN' }
})

// Listen for connection
socket.on('connect', () => console.log('Connected'))

// Join conversation
socket.emit('conversation:join', 'CONVERSATION_ID')

// Listen for messages
socket.on('message:new', (msg) => console.log('New message:', msg))

// Send message
socket.emit('message:new', { conversationId: 'CONV_ID', content: 'Test' })

// Typing indicator
socket.emit('message:typing', { conversationId: 'CONV_ID', isTyping: true })
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=mysql://user:pass@localhost:3306/doms
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=your_bucket
S3_PREFIX=dev/
S3_ACL=public-read
FRONTEND_ORIGIN=http://localhost:3000
PORT=4000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Error Handling

### Common Issues

#### "Students cannot message each other"
- **Cause**: Two student accounts trying to start a conversation
- **Solution**: Ensure at least one participant is a staff member (mentor, trainer, etc.)

#### File upload fails
- **Cause**: File too large or S3 credentials missing
- **Solution**: Check file size (< 100MB) and verify AWS credentials

#### WebSocket disconnects frequently
- **Cause**: Network issues or server crashes
- **Solution**: Check server logs, verify CORS settings, check network connection

#### Messages not syncing
- **Cause**: WebSocket not connected or room not joined
- **Solution**: Verify `conversation:join` was emitted, check browser console for errors

## Performance Considerations

1. **Message Pagination**: Conversations load last 50 messages by default (configurable)
2. **File Size**: Large files may cause UI lag during upload
3. **WebSocket Rooms**: Users automatically join room-based channels for scalability
4. **Database Indexes**: Recommend indexes on `conversationId`, `senderId`, `recipientId`

## Future Enhancements

1. **Message Search**: Full-text search across conversations
2. **Emoji Reactions**: Add emoji picker for reactions
3. **Voice/Video Calls**: Integrate Jitsi or Twilio
4. **Message Encryption**: End-to-end encryption for sensitive conversations
5. **Archived Conversations**: Archive old conversations
6. **Message Drafts**: Auto-save drafts locally
7. **Admin Moderation**: Monitor and moderate conversations
8. **File Sharing Quota**: Limit file storage per user
9. **Message Pinning**: Pin important messages
10. **Conversation Groups**: Group messaging (with role restrictions)

## Security Notes

1. **Authentication**: All endpoints require JWT token
2. **Authorization**: Users can only see their own conversations
3. **Role Validation**: Student-to-student messaging is blocked at controller level
4. **File Validation**: Server validates file types and sizes
5. **XSS Protection**: All message content is sanitized on display
6. **SQL Injection**: Using parameterized queries via Sequelize ORM

## Troubleshooting Checklist

- [ ] Backend server running on port 4000
- [ ] Frontend running on port 3000
- [ ] Database connection verified
- [ ] AWS S3 credentials configured
- [ ] WebSocket CORS settings match frontend origin
- [ ] Token is valid and user is authenticated
- [ ] Both users have approved roles
- [ ] Conversation exists in database
- [ ] No network firewall blocking WebSocket
- [ ] Check browser console for JavaScript errors
- [ ] Check server logs for backend errors
