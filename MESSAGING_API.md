# Messaging System - API Reference

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. Get or Create Conversation

**Endpoint:** `POST /api/messages/conversations`

**Purpose:** Get an existing conversation with another user, or create a new one

**Request:**
```bash
curl -X POST http://localhost:4000/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "recipientId": "uuid-of-other-user"
  }
```

**Response (201 Created / 200 OK):**
```json
{
  "id": "conv-uuid",
  "user1Id": "user1-uuid",
  "user2Id": "user2-uuid",
  "lastMessageAt": "2024-05-02T10:30:00Z",
  "createdAt": "2024-05-02T09:00:00Z",
  "updatedAt": "2024-05-02T10:30:00Z",
  "User1": {
    "id": "user1-uuid",
    "firstName": "John",
    "lastName": "Trainer",
    "profileImage": "https://...",
    "approvedRole": "TRAINER"
  },
  "User2": {
    "id": "user2-uuid",
    "firstName": "Jane",
    "lastName": "Student",
    "profileImage": "https://...",
    "approvedRole": "STUDENT"
  }
}
```

**Error Responses:**
- 400: `{ "error": "Recipient ID is required" }`
- 400: `{ "error": "Cannot create conversation with yourself" }`
- 404: `{ "error": "User not found" }`
- 403: `{ "error": "Students cannot message each other" }`

---

### 2. Get All Conversations

**Endpoint:** `GET /api/messages/conversations`

**Purpose:** Get all conversations for the current user

**Request:**
```bash
curl -X GET http://localhost:4000/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "id": "conv-uuid-1",
    "user1Id": "user1-uuid",
    "user2Id": "user2-uuid",
    "lastMessageAt": "2024-05-02T10:30:00Z",
    "createdAt": "2024-05-02T09:00:00Z",
    "updatedAt": "2024-05-02T10:30:00Z",
    "User1": { ... },
    "User2": { ... },
    "Messages": [
      {
        "id": "msg-uuid",
        "conversationId": "conv-uuid-1",
        "senderId": "user1-uuid",
        "recipientId": "user2-uuid",
        "content": "Latest message",
        "isRead": true,
        "readAt": "2024-05-02T10:35:00Z",
        "createdAt": "2024-05-02T10:30:00Z",
        "updatedAt": "2024-05-02T10:30:00Z",
        "Sender": { ... }
      }
    ],
    "otherUser": { ... }
  },
  ...
]
```

---

### 3. Get Messages in Conversation

**Endpoint:** `GET /api/messages/conversations/:conversationId/messages`

**Purpose:** Get all messages in a specific conversation with pagination

**Query Parameters:**
- `limit` (optional, default: 50): Number of messages to return
- `offset` (optional, default: 0): Offset for pagination

**Request:**
```bash
curl -X GET "http://localhost:4000/api/messages/conversations/conv-uuid/messages?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "id": "msg-uuid-1",
    "conversationId": "conv-uuid",
    "senderId": "user1-uuid",
    "recipientId": "user2-uuid",
    "content": "Hello there!",
    "isRead": true,
    "readAt": "2024-05-02T10:35:00Z",
    "createdAt": "2024-05-02T10:30:00Z",
    "updatedAt": "2024-05-02T10:30:00Z",
    "Sender": {
      "id": "user1-uuid",
      "firstName": "John",
      "lastName": "Trainer",
      "profileImage": "https://...",
      "approvedRole": "TRAINER"
    },
    "MessageFiles": []
  },
  {
    "id": "msg-uuid-2",
    "conversationId": "conv-uuid",
    "senderId": "user2-uuid",
    "recipientId": "user1-uuid",
    "content": "Hi! How are you?",
    "isRead": true,
    "readAt": "2024-05-02T10:36:00Z",
    "createdAt": "2024-05-02T10:31:00Z",
    "updatedAt": "2024-05-02T10:31:00Z",
    "Sender": {
      "id": "user2-uuid",
      "firstName": "Jane",
      "lastName": "Student",
      "profileImage": "https://...",
      "approvedRole": "STUDENT"
    },
    "MessageFiles": []
  }
]
```

**Side Effects:**
- All unread messages in this conversation are automatically marked as read

---

### 4. Send Message

**Endpoint:** `POST /api/messages/messages`

**Purpose:** Send a new message to a conversation

**Request:**
```bash
curl -X POST http://localhost:4000/api/messages/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "conversationId": "conv-uuid",
    "content": "This is my message"
  }
```

**Response (201 Created):**
```json
{
  "id": "msg-uuid",
  "conversationId": "conv-uuid",
  "senderId": "current-user-uuid",
  "recipientId": "other-user-uuid",
  "content": "This is my message",
  "isRead": false,
  "readAt": null,
  "createdAt": "2024-05-02T10:32:00Z",
  "updatedAt": "2024-05-02T10:32:00Z",
  "Sender": {
    "id": "current-user-uuid",
    "firstName": "John",
    "lastName": "Trainer",
    "profileImage": "https://...",
    "approvedRole": "TRAINER"
  },
  "MessageFiles": []
}
```

**WebSocket Event:**
- Emitted to `conversation:conversationId` room: `message:new` event with full message object

**Error Responses:**
- 400: `{ "error": "Conversation ID and content are required" }`
- 404: `{ "error": "Conversation not found" }`
- 403: `{ "error": "Unauthorized" }`

---

### 5. Mark Message as Read

**Endpoint:** `PUT /api/messages/messages/:messageId/read`

**Purpose:** Mark a single message as read by recipient

**Request:**
```bash
curl -X PUT http://localhost:4000/api/messages/messages/msg-uuid/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "id": "msg-uuid",
  "conversationId": "conv-uuid",
  "senderId": "other-user-uuid",
  "recipientId": "current-user-uuid",
  "content": "Message content",
  "isRead": true,
  "readAt": "2024-05-02T10:35:00Z",
  "createdAt": "2024-05-02T10:32:00Z",
  "updatedAt": "2024-05-02T10:35:00Z"
}
```

**WebSocket Event:**
- Emitted to `conversation:conversationId` room: `message:read` event

**Error Responses:**
- 404: `{ "error": "Message not found" }`
- 403: `{ "error": "Unauthorized" }`

---

### 6. Upload File for Message

**Endpoint:** `POST /api/messages/messages/:messageId/files`

**Purpose:** Upload a file attachment to an existing message

**Requirements:**
- Message must already exist
- Current user must be the sender of the message
- File size: max 100MB
- Content-Type: multipart/form-data

**Request:**
```bash
curl -X POST http://localhost:4000/api/messages/messages/msg-uuid/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

**Response (201 Created):**
```json
{
  "id": "file-uuid",
  "messageId": "msg-uuid",
  "fileName": "document.pdf",
  "fileSize": 2048576,
  "fileType": "application/pdf",
  "fileUrl": "https://s3.amazonaws.com/bucket/messages/user-uuid/123456-document.pdf",
  "s3Key": null,
  "createdAt": "2024-05-02T10:33:00Z",
  "updatedAt": "2024-05-02T10:33:00Z"
}
```

**File Type Examples:**
- `application/pdf` for PDF files
- `image/jpeg`, `image/png` for images
- `video/mp4` for video files
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` for Word docs
- `application/vnd.ms-excel` for Excel files

**Error Responses:**
- 400: `{ "error": "No file provided" }`
- 404: `{ "error": "Message not found" }`
- 403: `{ "error": "Unauthorized" }`
- 413: File too large (> 100MB)

**Side Effects:**
- File is uploaded to AWS S3
- File record is created in database

---

### 7. Delete Message

**Endpoint:** `DELETE /api/messages/messages/:messageId`

**Purpose:** Delete a message (sender only)

**Request:**
```bash
curl -X DELETE http://localhost:4000/api/messages/messages/msg-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**WebSocket Event:**
- Emitted to `conversation:conversationId` room: `message:deleted` event with `messageId`

**Error Responses:**
- 404: `{ "error": "Message not found" }`
- 403: `{ "error": "Unauthorized" }`

---

### 8. Get Unread Message Count

**Endpoint:** `GET /api/messages/messages/unread/count`

**Purpose:** Get total count of unread messages for current user

**Request:**
```bash
curl -X GET http://localhost:4000/api/messages/messages/unread/count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "unreadCount": 5
}
```

---

## Error Handling

All error responses follow this format:
```json
{
  "error": "Error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid parameters)
- `403` - Forbidden (unauthorized action)
- `404` - Not Found
- `500` - Server Error

---

## WebSocket Events Reference

### Client-side Events (Emit)

```javascript
// Join a conversation
socket.emit('conversation:join', 'conversationId')

// Leave a conversation
socket.emit('conversation:leave', 'conversationId')

// Send typing indicator
socket.emit('message:typing', {
  conversationId: 'conversationId',
  isTyping: true  // or false
})

// Send read receipt
socket.emit('message:read', {
  conversationId: 'conversationId',
  messageId: 'messageId'
})

// React with emoji (optional)
socket.emit('message:react', {
  conversationId: 'conversationId',
  messageId: 'messageId',
  reaction: '👍'  // any emoji or string
})
```

### Server-side Events (Listen)

```javascript
// New message arrived
socket.on('message:new', (message) => {
  console.log(message)
})

// Message was read
socket.on('message:read', (data) => {
  console.log(data.messageId, data.userId, data.timestamp)
})

// Message was deleted
socket.on('message:deleted', (data) => {
  console.log(data.messageId)
})

// Someone is typing
socket.on('message:typing', (data) => {
  console.log(data.userId, data.isTyping)
})

// User came online
socket.on('user:online', (data) => {
  console.log(data.userId, data.timestamp)
})

// User went offline
socket.on('user:offline', (data) => {
  console.log(data.userId, data.timestamp)
})
```

---

## Example Usage

### Complete Conversation Flow in JavaScript

```javascript
// 1. Initialize WebSocket
const socket = io('http://localhost:4000', {
  auth: {
    userId: 'your-user-id',
    token: 'your-jwt-token'
  }
})

// 2. Create/get conversation
const convResponse = await fetch(
  'http://localhost:4000/api/messages/conversations',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-jwt-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ recipientId: 'recipient-id' })
  }
)
const conversation = await convResponse.json()

// 3. Join conversation room
socket.emit('conversation:join', conversation.id)

// 4. Listen for new messages
socket.on('message:new', (message) => {
  console.log('New message:', message.content)
})

// 5. Get existing messages
const messagesResponse = await fetch(
  `http://localhost:4000/api/messages/conversations/${conversation.id}/messages`,
  {
    headers: { 'Authorization': 'Bearer your-jwt-token' }
  }
)
const messages = await messagesResponse.json()

// 6. Send a message
const sendResponse = await fetch(
  'http://localhost:4000/api/messages/messages',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-jwt-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId: conversation.id,
      content: 'Hello!'
    })
  }
)
const sentMessage = await sendResponse.json()

// 7. Upload file to message
const formData = new FormData()
formData.append('file', fileInput.files[0])

const uploadResponse = await fetch(
  `http://localhost:4000/api/messages/messages/${sentMessage.id}/files`,
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-jwt-token'
    },
    body: formData
  }
)
const fileRecord = await uploadResponse.json()

// 8. Mark as read
const readResponse = await fetch(
  `http://localhost:4000/api/messages/messages/${messages[0].id}/read`,
  {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer your-jwt-token' }
  }
)

// 9. Clean up
socket.emit('conversation:leave', conversation.id)
socket.disconnect()
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding:
- Max 100 messages per minute per user
- Max 10 file uploads per minute per user
- Max 5 new conversations per minute per user

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Message content should be plain text (HTML will be rendered as text)
- File URLs are S3 public URLs
- WebSocket auto-reconnects with exponential backoff
- Conversations are sorted by `lastMessageAt` descending
