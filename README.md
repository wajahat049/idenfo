# Work Item Management System

An internal web application for managing work items through their lifecycle with role-based access control, state management, and comprehensive audit trails.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Work Item Management**: Create, update, and track work items through defined states
- **State Machine**: Enforced state transitions with role-based permissions
- **Blocking System**: Block/unblock work items with reasons
- **Audit Trail**: Complete history of all changes, state transitions, and blocking events
- **Concurrent Update Handling**: Server-side validation prevents conflicting updates
- **Modern UI**: Clean, responsive React interface with clear feedback

## Technology Stack

### Backend

- **Node.js** with **Express.js**
- **SQLite** database for persistence
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend

- **React** 18 with functional components and hooks
- **React Router** for navigation
- **Axios** for API communication
- Modern CSS with responsive design

## Project Structure

```
.
├── server/                 # Backend application
│   ├── db/                # Database setup and configuration
│   ├── middleware/        # Authentication middleware
│   ├── models/            # Data models (WorkItem)
│   ├── routes/            # API routes
|   ├── services/          # Queries
│   └── index.js           # Server entry point
├── client/                # Frontend application
│   ├── public/            # Static files
│   └── src/
│       ├── components/    # Reusable components
│       ├── context/       # React context (Auth)
│       ├── pages/         # Page components
│       └── services/      # API service layer
│       └── styles/        # CSS Styles
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or navigate to the project directory**

2. **Install all dependencies** (root, server, and client):

   ```bash
   npm run install-all
   ```

   Or install manually:

   ```bash
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

3. **Set up environment variables** (optional):

   ```bash
   cd server
   cp .env.example .env
   ```

   Edit `.env` and set:

   - `PORT`: Server port (default: 5000)
   - `JWT_SECRET`: Secret key for JWT tokens
   - `JWT_EXPIRES_IN`: Token expiration (default: 24h)

### Running the Application

#### Option 1: Run both server and client together

```bash
npm run dev
```

#### Option 2: Run separately

**Terminal 1 - Backend:**

```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd client
npm start
```

The backend will run on `http://localhost:5000`
The frontend will run on `http://localhost:3000`

## Default Users

The system comes with pre-configured users for testing:

| Username  | Password    | Role      | Permissions                                       |
| --------- | ----------- | --------- | ------------------------------------------------- |
| admin     | password123 | admin     | Full access, can bypass state transition rules    |
| manager   | password123 | manager   | Can create, update, block, view all items         |
| developer | password123 | developer | Can create, update own items, limited transitions |
| viewer    | password123 | viewer    | Read-only access                                  |

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires auth)

### Work Items

- `GET /api/work-items` - List all work items (filtered by role)
- `GET /api/work-items/:id` - Get work item details
- `POST /api/work-items` - Create new work item
- `PUT /api/work-items/:id` - Update work item
- `GET /api/work-items/:id/history` - Get work item history
- `GET /api/work-items/:id/transitions` - Get available state transitions
- `POST /api/work-items/:id/block` - Block work item
- `POST /api/work-items/:id/unblock` - Unblock work item

## Design Decisions

### State Machine

Work items move through the following states:

- **draft** → in_review, rejected
- **in_review** → approved, rejected, rework
- **approved** → in_progress
- **in_progress** → completed, rework
- **completed** → (terminal state)
- **rejected** → draft
- **rework** → in_review, draft

State transitions are enforced server-side and validated against:

1. Valid transition rules
2. User role permissions
3. Blocking status (blocked items cannot transition)

### Role-Based Permissions

**Admin**

- Full access to all operations
- Can bypass state transition rules
- Can view all work items

**Manager**

- Can create, update, and block work items
- Can perform all valid state transitions
- Can view all work items
- Cannot delete work items

**Developer**

- Can create and update work items
- Limited state transitions (in_progress, completed, rework)
- Can only view own work items
- Cannot block work items

**Viewer**

- Read-only access
- Can view all work items
- Cannot perform any modifications

### Data Integrity

1. **Server-side Validation**: All business rules enforced at API level
2. **Concurrent Updates**: Last-write-wins with validation
3. **Foreign Key Constraints**: Database-level referential integrity
4. **Transaction Safety**: SQLite transactions for critical operations

### Blocking System

- Work items can be blocked with a required reason
- Blocked items cannot transition states
- Block/unblock events are recorded in history
- Only managers and admins can block/unblock

### Audit Trail

All changes are recorded in `work_item_history`:

- State changes
- Title/description updates
- Blocking/unblocking events
- Rework events with reasons
- Creation events

Each history entry includes:

- User who made the change
- Change type
- Old and new values (when applicable)
- Timestamp
- Description

## Edge Case Handling

### Concurrent Updates

- Server validates state before allowing transitions
- If a work item changes state while being viewed, the next update will reflect the current state
- Invalid transitions return clear error messages

### Invalid Data

- All inputs validated using express-validator
- Invalid state transitions rejected with descriptive errors
- Missing required fields return 400 Bad Request

### Authorization Failures

- Unauthorized requests return 401 Unauthorized
- Insufficient permissions return 403 Forbidden
- Clear error messages guide users

### Blocked Items

- Blocked items cannot transition states
- UI clearly indicates blocked status
- Block reason displayed to users

## Known Limitations

1. **Database**: Uses SQLite for simplicity. For production, consider PostgreSQL or MySQL for better concurrency handling.

2. **Real-time Updates**: The UI doesn't automatically refresh when work items change. Users need to refresh or navigate away and back.

3. **Optimistic Locking**: No version numbers or ETags for preventing concurrent edits. Last write wins.

4. **Pagination**: Work items list doesn't paginate. For large datasets, implement pagination.

5. **Search/Filter**: No search or filtering capabilities in the work items list.

6. **File Attachments**: Work items don't support file attachments.

7. **Notifications**: No notification system for state changes or assignments.

## Assumptions

1. **Single Organization**: All users belong to the same organization
2. **Work Item Ownership**: Work items are created by users but ownership isn't transferable
3. **State Transitions**: All transitions are immediate (no pending/approval states)
4. **Rework Flow**: Rework can go back to draft or in_review depending on severity
5. **Blocking**: Blocking is temporary and requires manual unblocking
6. **History Retention**: All history is retained indefinitely

## Security Considerations

1. **Password Storage**: Passwords hashed using bcryptjs
2. **JWT Tokens**: Tokens expire after 24 hours (configurable)
3. **Input Validation**: All inputs validated and sanitized
4. **SQL Injection**: Parameterized queries prevent SQL injection
5. **CORS**: Configured for development. Adjust for production.

## Future Enhancements

- Register Flow
- User management UI
- Work item assignments
- Comments/notes on work items
- Email notifications
- Advanced search and filtering
- Export functionality
- Dashboard with statistics
- Work item templates
- Bulk operations

## Troubleshooting

### Database Issues

If the database doesn't initialize:

```bash
cd server
node scripts/initDatabase.js
```

### Port Conflicts

If port 5000 or 3000 are in use:

- Backend: Set `PORT` in `server/.env`
- Frontend: React will prompt to use a different port

### CORS Errors

Ensure the frontend proxy is configured in `client/package.json`:

```json
"proxy": "http://localhost:5000"
```
