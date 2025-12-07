# CoreSync - Daily Habit & Workout Hub

**Live Demo:** https://coresync-940t.onrender.com/

A full-stack Flask web application for fitness tracking with AI-powered workout generation.

**Created By:** Runnelle Moredo (100822547) and Almas Alam (100815977)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, UML diagrams |
| [API Reference](docs/API.md) | All API endpoints |
| [Deployment Guide](docs/DEPLOYMENT.md) | Deployment and Docker |
| [Performance](docs/PERFORMANCE.md) | PageSpeed analysis |

---

## Features

- **User Authentication** - JWT-based login/signup with CoreSync branding
- **Password Reset** - Email-based password recovery (Brevo/Gmail/Demo mode)
- **User Profile** - Manage profile info, height, weight, profile photo
- **Goal Tracking** - Create, edit, delete fitness goals
- **Exercise Finder** - Search from ExerciseDB with GIFs
- **AI Workout Plans** - OpenAI-powered personalized workouts
- **Session Tracking** - Timer, set/rep logging
- **Progress Photos** - Upload photos with each workout
- **Workout History** - View, save, and reuse past sessions
- **Dark Mode** - System-wide dark mode support

---

## Architecture

- **Backend:** Flask (Python)
- **Database:** PostgreSQL (SQLAlchemy ORM)
- **Auth:** JWT (Flask-JWT-Extended)
- **Frontend:** Jinja2 + TailwindCSS + JavaScript
- **External APIs:** ExerciseDB, OpenAI

See [Architecture Documentation](docs/ARCHITECTURE.md) for UML diagrams.

---

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL (or SQLite for development)

### Local Setup

```bash
# Clone repository
git clone https://github.com/RunnelleMoredo/CSCI-4230U---Advanced-Web-Development-Final-Project-.git
cd CSCI-4230U---Advanced-Web-Development-Final-Project-

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:
```env
# Required
DATABASE_URL=sqlite:///instance/database.db
JWT_SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-your-openai-key

# Optional - Email for Password Reset
# Without these, password reset works in "demo mode" (reset link prints to console)
BREVO_API_KEY=your-brevo-api-key          # Recommended for production
MAIL_USERNAME=your-email@gmail.com        # Gmail SMTP (works locally)
MAIL_PASSWORD=your-gmail-app-password     # Gmail App Password
```

### Run

```bash
flask run
```

Visit http://localhost:5000

---

## Password Reset Feature

The app includes a complete password reset flow:

1. User clicks "Forgot Password?" on login page
2. Enters their email → receives reset link
3. Clicks link → enters new password → done!

### Email Configuration Options

| Provider | Best For | Setup |
|----------|----------|-------|
| **Demo Mode** | Testing without email | No config needed - URL prints to console |
| **Brevo** | Production/Render | Free account at brevo.com |
| **Gmail SMTP** | Local development | Requires App Password |

### Demo Mode (No Email Config)
If no email credentials are configured, the reset URL is printed to the Flask console:
```
PASSWORD RESET EMAIL (Demo Mode - Email not configured)
============================================================
To: user@example.com
Reset URL: http://127.0.0.1:5000/reset_password?token=xyz...
============================================================
```
Copy this URL to test the full password reset flow without email setup!

---

## Docker

```bash
# Build and run
docker build -t coresync .
docker run -p 5000:5000 coresync

# Or with docker-compose
docker-compose up
```

---

## Testing

```bash
# Run unit tests
pytest tests/test_unit.py -v

# Run Selenium tests (requires browser)
pytest tests/test_app_sb.py -v
```

---

## Project Structure

```
├── app.py              # Main Flask app
├── auth.py             # Authentication routes
├── goals.py            # Goals API
├── workout.py          # Workout API
├── models.py           # SQLAlchemy models
├── schemas.py          # Marshmallow schemas
├── templates/          # Jinja2 HTML templates
├── static/
│   ├── scripts/        # JavaScript files
│   └── styles/         # CSS files
├── tests/              # Test files
├── docs/               # Documentation
├── Dockerfile          # Container config
└── .github/workflows/  # CI/CD
```

---

## Security

- Passwords hashed with Werkzeug
- JWT tokens for API authentication
- Protected endpoints require authorization
- HTTPS enabled on production

---

## CI/CD

GitHub Actions runs on every push:
- Lint (flake8)
- Unit tests (pytest)
- Build verification

---

## License

MIT License
