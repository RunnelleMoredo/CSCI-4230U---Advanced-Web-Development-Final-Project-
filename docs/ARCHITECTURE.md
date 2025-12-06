# Architecture Documentation

## Overview

CoreSync is a **Flask-based web application** following the **MVC (Model-View-Controller)** architectural pattern with RESTful API design.

---

## Package Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        HTML[HTML Templates]
        JS[JavaScript]
        CSS[CSS/TailwindCSS]
    end
    
    subgraph "Backend Layer - Flask"
        subgraph "Controllers/Routes"
            AUTH[auth.py<br/>Authentication]
            GOALS[goals.py<br/>Goals API]
            WORKOUT[workout.py<br/>Workout API]
            AI[app.py<br/>AI Endpoints]
        end
        
        subgraph "Models"
            MODELS[models.py<br/>SQLAlchemy ORM]
        end
        
        subgraph "Schemas"
            SCHEMAS[schemas.py<br/>Marshmallow]
        end
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Database)]
    end
    
    subgraph "External APIs"
        EXERCISEDB[ExerciseDB API]
        OPENAI[OpenAI API]
    end
    
    HTML --> JS
    JS --> AUTH
    JS --> GOALS
    JS --> WORKOUT
    JS --> AI
    
    AUTH --> MODELS
    GOALS --> MODELS
    WORKOUT --> MODELS
    AI --> MODELS
    
    MODELS --> DB
    WORKOUT --> EXERCISEDB
    AI --> OPENAI
```

---

## Class Diagram

```mermaid
classDiagram
    class User {
        +int id
        +string username
        +string password_hash
        +datetime created_at
        +goals: Goal[]
        +sessions: Session[]
        +workouts: Workout[]
    }
    
    class Goal {
        +int id
        +string title
        +string description
        +int user_id
        +datetime created_at
    }
    
    class Session {
        +int id
        +int user_id
        +int duration_seconds
        +json details
        +datetime created_at
    }
    
    class WorkoutPlan {
        +int id
        +int user_id
        +json plan
        +datetime created_at
    }
    
    class Workout {
        +int id
        +int user_id
        +string title
        +string category
        +int sets
        +int reps
        +json details
        +datetime created_at
    }
    
    User "1" --> "*" Goal : has
    User "1" --> "*" Session : completes
    User "1" --> "*" WorkoutPlan : generates
    User "1" --> "*" Workout : saves
```

---

## Component Responsibilities

### Frontend (templates/, static/)
- **HTML Templates**: Jinja2 templates for page rendering
- **JavaScript**: Client-side logic, API calls, localStorage management
- **CSS**: TailwindCSS styling with dark mode support

### Backend (Flask Blueprints)
- **auth.py**: User registration, login, JWT token management
- **goals.py**: CRUD operations for user goals
- **workout.py**: Exercise search, workout management, session tracking
- **app.py**: Main app, AI workout generation endpoints

### Data Layer
- **models.py**: SQLAlchemy ORM models
- **schemas.py**: Marshmallow serialization schemas
- **PostgreSQL**: Production database (SQLite for development)

### External Integrations
- **ExerciseDB API**: Exercise database with GIFs and instructions
- **OpenAI API**: AI-powered workout plan generation
