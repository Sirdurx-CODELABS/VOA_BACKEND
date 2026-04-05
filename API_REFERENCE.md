# VOA System - API Reference

Base URL: `http://localhost:5000/api`

---

## AUTH `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login |
| GET | `/verify-email/:token` | No | Verify email |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password` | No | Reset password |
| GET | `/me` | Yes | Get current user |
| PUT | `/change-password` | Yes | Change password |

### Register
```json
POST /api/auth/register
{ "fullName": "John Doe", "email": "john@example.com", "password": "Pass@123", "phone": "08012345678" }
```

### Login
```json
POST /api/auth/login
{ "email": "john@example.com", "password": "Pass@123" }
```
Response: `{ token, user: { id, fullName, email, role, isVice } }`

---

## USERS `/api/users`
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/` | chairman, secretary, membership_coordinator | List all users |
| GET | `/:id` | authenticated | Get user by ID |
| PUT | `/:id` | authenticated | Update user |
| DELETE | `/:id` | chairman | Delete user |
| PATCH | `/:id/approve` | chairman, membership_coordinator | Approve user |
| PATCH | `/:id/reject` | chairman, membership_coordinator | Reject user |
| PATCH | `/:id/assign-role` | chairman | Assign role |
| PUT | `/profile/image` | authenticated | Upload profile image |

### Assign Role
```json
PATCH /api/users/:id/assign-role
{ "role": "secretary", "isVice": false, "reportsTo": "<userId>" }
```

---

## PROGRAMS `/api/programs`
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/` | authenticated | List programs |
| GET | `/:id` | authenticated | Get program |
| POST | `/` | chairman, program_coordinator | Create program |
| PUT | `/:id` | chairman, program_coordinator | Update program |
| DELETE | `/:id` | chairman, program_coordinator | Delete program |
| POST | `/:id/assign-members` | chairman, program_coordinator | Assign members |
| POST | `/:id/remove-members` | chairman, program_coordinator | Remove members |

### Create Program
```json
POST /api/programs
{ "title": "Annual Gala", "description": "...", "date": "2026-06-01", "budget": 50000, "venue": "City Hall" }
```

---

## ATTENDANCE `/api/attendance`
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/` | chairman, secretary | Record attendance |
| POST | `/bulk` | chairman, secretary | Bulk record |
| GET | `/program/:programId` | authenticated | Program attendance |
| GET | `/program/:programId/summary` | authenticated | Attendance summary |
| GET | `/user/:userId` | authenticated | User attendance |
| GET | `/me` | authenticated | My attendance |

### Record Attendance
```json
POST /api/attendance
{ "userId": "<id>", "programId": "<id>", "status": "present", "notes": "On time" }
```

### Bulk Record
```json
POST /api/attendance/bulk
{ "programId": "<id>", "records": [{ "userId": "<id>", "status": "present" }, { "userId": "<id>", "status": "absent" }] }
```

---

## TRANSACTIONS `/api/transactions`
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/` | chairman, treasurer | List transactions |
| GET | `/summary` | chairman, treasurer | Financial summary |
| GET | `/:id` | chairman, treasurer | Get transaction |
| POST | `/` | chairman, treasurer | Create transaction |
| PATCH | `/:id/approve` | chairman | Approve transaction |
| PATCH | `/:id/reject` | chairman | Reject transaction |

### Create Transaction
```json
POST /api/transactions
{ "title": "Hall Rental", "amount": 25000, "type": "expense", "programId": "<id>" }
```

---

## REPORTS `/api/reports`
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/` | authenticated | List reports |
| GET | `/:id` | authenticated | Get report |
| POST | `/` | chairman, secretary | Create report (multipart) |
| PUT | `/:id` | chairman, secretary | Update report |
| DELETE | `/:id` | chairman, secretary | Delete report |

### Create Report (multipart/form-data)
```
POST /api/reports
title, content, programId (optional), type, attachments[] (files)
```

---

## ANNOUNCEMENTS `/api/announcements`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/public` | No | Public announcements |
| GET | `/` | Yes | All announcements |
| GET | `/:id` | Yes | Get announcement |
| POST | `/` | chairman, pro | Create announcement |
| PUT | `/:id` | chairman, pro | Update |
| DELETE | `/:id` | chairman, pro | Delete |

---

## WELFARE `/api/welfare`
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/` | chairman, welfare_officer | All requests |
| GET | `/:id` | authenticated | Get request |
| POST | `/` | authenticated | Submit request |
| PATCH | `/:id/status` | chairman, welfare_officer | Update status |
| POST | `/:id/follow-up` | chairman, welfare_officer | Add follow-up |

### Submit Welfare Request
```json
POST /api/welfare
{ "type": "financial", "message": "Need assistance with medical bills" }
```

---

## ANALYTICS `/api/analytics`
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/dashboard` | authenticated | Dashboard summary |
| GET | `/members` | chairman, membership_coordinator | Member stats |
| GET | `/leaderboard` | authenticated | Top contributors |
| GET | `/programs` | authenticated | Program metrics |
| GET | `/inactive-users` | chairman, membership_coordinator | Inactive users |
| POST | `/alert-inactive` | chairman | Alert inactive users |

---

## NOTIFICATIONS `/api/notifications`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | My notifications |
| GET | `/unread-count` | Unread count |
| PATCH | `/:id/read` | Mark as read |
| PATCH | `/mark-all-read` | Mark all read |
| DELETE | `/:id` | Delete notification |

---

## Query Parameters (Pagination & Filtering)
All list endpoints support:
- `?page=1&limit=10` - Pagination
- `?search=keyword` - Search (where applicable)
- `?status=active` - Filter by status
- `?role=secretary` - Filter by role (users)

## Authentication Header
```
Authorization: Bearer <token>
```

## Role Permissions Summary
| Role | Access |
|------|--------|
| chairman | Full access to everything |
| secretary | Reports, attendance, read users/programs |
| treasurer | Transactions, read programs |
| pro | Announcements, read programs |
| program_coordinator | Programs, read users/attendance |
| membership_coordinator | Manage users |
| welfare_officer | Welfare requests |
| member | Read programs/announcements, submit welfare, own attendance |
