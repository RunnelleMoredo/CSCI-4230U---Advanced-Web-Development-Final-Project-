# API Documentation

## Base URL
- **Production**: `https://coresync-du88.onrender.com`
- **Development**: `http://localhost:5000`

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login and get JWT token | ❌ |

#### Register
```json
POST /auth/register
{
    "username": "string",
    "password": "string"
}

Response 201:
{
    "message": "User created",
    "user_id": 1
}
```

#### Login
```json
POST /auth/login
{
    "username": "string",
    "password": "string"
}

Response 200:
{
    "access_token": "jwt_token_here"
}
```

---

### Goals (`/goals`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/goals/` | Get all user goals | ✅ |
| POST | `/goals/` | Create new goal | ✅ |
| PUT | `/goals/<id>` | Update goal | ✅ |
| DELETE | `/goals/<id>` | Delete goal | ✅ |

#### Create Goal
```json
POST /goals/
{
    "title": "string",
    "description": "string"
}

Response 201:
{
    "message": "Goal created",
    "goal": { ... }
}
```

---

### Workouts (`/workout`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workout/search?q=<query>` | Search exercises | ✅ |
| GET | `/workout/all` | Get all saved workouts | ✅ |
| GET | `/workout/<id>` | Get specific workout | ✅ |
| DELETE | `/workout/<id>` | Delete workout | ✅ |
| POST | `/workout/session` | Save completed session | ✅ |
| POST | `/workout/ai/workout-plan/save` | Save AI plan as workout | ✅ |

#### Search Exercises
```
GET /workout/search?q=bench

Response 200:
[
    {
        "name": "Bench Press",
        "targetMuscles": ["chest"],
        "equipments": ["barbell"],
        "gifUrl": "https://...",
        "instructions": [...]
    }
]
```

---

### AI Workout (`/ai`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ai/workout-plan` | Generate AI workout plan | ✅ |

#### Generate AI Plan
```json
POST /ai/workout-plan
{
    "goal": "Build muscle",
    "experience": "beginner",
    "days_per_week": 3,
    "equipment": "dumbbells",
    "injuries": "none"
}

Response 200:
{
    "id": 1,
    "plan": {
        "weekly_plan": [...]
    }
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 404 | Not Found - Resource doesn't exist |
| 422 | Unprocessable - Missing required fields |
| 500 | Server Error |

```json
{
    "error": "Error message here"
}
```
