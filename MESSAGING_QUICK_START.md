# Messaging System - Quick Start Guide

## ✅ Implementation Complete

A full-featured WebSocket-based messaging system has been implemented with the following features:

### Core Features
✅ **Real-time messaging** between admin, mentors, trainers, coordinators, and students  
✅ **WebSocket integration** for instant message delivery  
✅ **File upload support** (up to 100MB per file) with S3 storage  
✅ **Typing indicators** (shows when someone is typing)  
✅ **Read receipts** (✓ sent, ✓✓ read)  
✅ **Role-based access control** (students cannot message each other)  
✅ **Conversation persistence** (message history)  
✅ **Responsive UI** (works on desktop and mobile)  

## 🚀 Getting Started

### Step 1: Start the Backend Server

```bash
cd backend
npm start
```

You should see:
```
Server running on port 4000
Database connection successful
Database models synced
```

### Step 2: Start the Frontend Dev Server

In a new terminal:
```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`

### Step 3: Test the Messaging System

#### Option A: Web Browser Testing

1. **Open Two Browser Windows Side-by-Side**
   - Window 1: Login as a **trainer/mentor** (staff account)
   - Window 2: Login as a **student** account

2. **Open Messages Page in Both**
   - Navigate to `http://localhost:3000/messages` in both windows
   - Both should show their conversations list

3. **Start a Conversation**
   - In Window 1 (trainer): Click "New Conversation" or search for student
   - Select the student from Window 2
   - You should see the conversation appear in Window 2

4. **Send Messages**
   - Trainer (Window 1): Type "Hello student!" and press Send
   - Message appears instantly in Window 2 in real-time ✨
   - Student replies: "Hi trainer!"
   - Trainer sees reply instantly

5. **Test Typing Indicator**
   - Student (Window 2): Start typing without sending
   - Trainer (Window 1): See "typing..." indicator
   - Stop typing → indicator disappears

6. **Test Read Receipts**
   - Send message as trainer
   - Watch for checkmarks:
     - ✓ = message sent
     - ✓✓ = message read (when student clicks conversation)

7. **Test File Upload**
   - Click 📎 (attachment) button
   - Select any file (PDF, image, document, etc.)
   - File appears in preview
   - Send message
   - Student sees file as downloadable link
   - Click to download ✓

#### Option B: Testing Blocked Features

1. **Test Student-to-Student Block**
   - Login as Student A
   - Go to Messages
   - Try to create conversation with Student B
   - Should see error: "Students cannot message each other"

2. **Test Role-Based Access**
   - Admin can message: any student ✓
   - Mentor can message: any student ✓
   - Trainer can message: any student ✓
   - Student can message: mentor, trainer, admin ✓
   - Student cannot message: another student ✗

## 📁 Implementation Files

### Backend
```
backend/
├── src/
│   ├── controllers/
│   │   └── messageController.js          [New] Message CRUD + WebSocket
│   ├── routes/
│   │   └── messageRoutes.js              [New] Message endpoints
│   ├── models/
│   │   └── index.js                      [Modified] Added Message models
│   └── index.js                          [Modified] WebSocket setup
```

### Frontend
```
frontend/
├── app/
│   ├── messages/
│   │   └── page.tsx                      [New] Messaging page
│   ├── components/
│   │   └── Messaging.tsx                 [New] Main messaging UI
│   └── lib/
│       ├── services/
│       │   └── messageService.ts         [New] WebSocket service
│       └── types/
│           └── messaging.ts              [New] TypeScript types
```

## 🔧 API Endpoints

All endpoints require JWT authentication:

```
GET    /api/messages/conversations                      → Get all conversations
POST   /api/messages/conversations                      → Create conversation
GET    /api/messages/conversations/:id/messages         → Get messages
POST   /api/messages/messages                           → Send message
DELETE /api/messages/messages/:id                       → Delete message
PUT    /api/messages/messages/:id/read                  → Mark as read
POST   /api/messages/messages/:id/files                 → Upload file
GET    /api/messages/messages/unread/count              → Get unread count
```

## 🔌 WebSocket Events

### Emitted by Client
```javascript
socket.emit('conversation:join', conversationId)
socket.emit('conversation:leave', conversationId)
socket.emit('message:typing', { conversationId, isTyping })
socket.emit('message:read', { conversationId, messageId })
```

### Received by Client
```javascript
socket.on('message:new', (message) => {})
socket.on('message:read', (data) => {})
socket.on('message:deleted', (data) => {})
socket.on('message:typing', (data) => {})
socket.on('user:online', (data) => {})
socket.on('user:offline', (data) => {})
```

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "WebSocket connection failed" | Check backend is running on port 4000 |
| Messages not showing in real-time | Refresh page, check browser console for errors |
| File upload fails | Ensure file < 100MB, AWS credentials configured |
| Conversations not loading | Check JWT token is valid, verify user role |
| "Students cannot message each other" | Try with a mentor/trainer account (expected behavior) |

## 🧪 Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads at localhost:3000
- [ ] Can login as different roles
- [ ] Can navigate to /messages page
- [ ] Conversations list displays
- [ ] Can start new conversation (non-student to student)
- [ ] Messages send and appear in real-time
- [ ] Can type and see typing indicator
- [ ] Read receipts show (✓ and ✓✓)
- [ ] Can upload files and download them
- [ ] Student-to-student messaging blocked with error
- [ ] Page is responsive on mobile

## 📊 Database Tables Created

```sql
CREATE TABLE conversations (
  id CHAR(36) PRIMARY KEY,
  user1_id CHAR(36) NOT NULL,
  user2_id CHAR(36) NOT NULL,
  last_message_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  INDEX (user1_id, user2_id)
)

CREATE TABLE messages (
  id CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
)

CREATE TABLE message_files (
  id CHAR(36) PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  file_name VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  file_url VARCHAR(500),
  s3_key VARCHAR(500),
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (message_id) REFERENCES messages(id)
)
```

## 🎨 UI Components

### Messaging Component Features
- **Conversation Sidebar**: List of all conversations with other user info
- **Chat Area**: Message display with sender/recipient differentiation
- **Input Zone**: Text input with attachment button and send button
- **File Preview**: Shows selected files before sending
- **Typing Indicator**: Animated dots showing "someone is typing"
- **Read Receipts**: Checkmarks indicating message status
- **File Download**: Click file to download from S3

## 🔐 Security Features

✅ JWT authentication required for all endpoints  
✅ User can only access their own conversations  
✅ Student-to-student messaging blocked at controller level  
✅ File size validation (100MB limit)  
✅ File type validation  
✅ XSS protection (content sanitized)  
✅ SQL injection protection (Sequelize ORM)  

## 📚 Documentation

For detailed information, see:
- [MESSAGING_SYSTEM.md](../MESSAGING_SYSTEM.md) - Complete system documentation

## 🎯 Next Steps

1. Test all features as described in "Getting Started"
2. Verify messages persist across page refreshes
3. Check that conversations list updates in real-time
4. Test with actual files of different types
5. Monitor browser console for WebSocket errors
6. Check server logs for any issues

## 💡 Tips

- Use F12 to open browser DevTools and monitor WebSocket activity
- Check the Network tab to see WebSocket frames
- Use React DevTools to inspect component state
- Server logs show all connections and events
- Both windows should connect to same backend

## 🚨 Need Help?

If you encounter issues:

1. **Check Browser Console** (F12 > Console tab)
   - Look for JavaScript errors
   - Check WebSocket connection status

2. **Check Server Logs** (terminal where you ran `npm start`)
   - Look for error messages
   - Watch for connection logs

3. **Verify Configurations**
   - Backend on port 4000
   - Frontend on port 3000
   - Database connected
   - AWS S3 credentials (if uploading files)

4. **Test Endpoints with curl**
   ```bash
   curl -X GET http://localhost:4000/api/messages/conversations \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## ✨ You're All Set!

The WebSocket messaging system is fully implemented and ready to use. Start the servers and begin testing!
