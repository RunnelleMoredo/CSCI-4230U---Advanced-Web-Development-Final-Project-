# Deployment Guide

## Production Deployment (Render)

The application is deployed on **Render** at:
- **URL**: https://coresync-du88.onrender.com/
- **Platform**: Render Web Service
- **SSL**: Automatic HTTPS (HTTP/2)

### Render Configuration

1. **Build Command**: `pip install -r requirements.txt`
2. **Start Command**: `gunicorn app:app`
3. **Environment Variables**:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET_KEY` - Secret for JWT tokens
   - `OPENAI_API_KEY` - OpenAI API key for AI features

---

## Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t coresync .

# Run the container
docker run -p 5000:5000 \
  -e DATABASE_URL=your_db_url \
  -e JWT_SECRET_KEY=your_secret \
  -e OPENAI_API_KEY=your_key \
  coresync
```

### Docker Compose (Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop services
docker-compose down
```

---

## Local Development

### Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:
```
DATABASE_URL=sqlite:///local.db
JWT_SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-your-api-key
```

### Run

```bash
flask run
# or
python app.py
```

---

## CI/CD Pipeline

GitHub Actions workflow runs on every push:

1. **Lint** - Checks Python syntax with flake8
2. **Test** - Runs pytest unit tests
3. **Build** - Verifies app imports correctly

See `.github/workflows/ci.yml` for configuration.

---

## Database

### Production
- **PostgreSQL** on Render
- Automatic backups

### Development
- **SQLite** for local testing

### Migrations
```bash
# Initialize (if using Flask-Migrate)
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

---

## Security Checklist

- ✅ HTTPS enabled (Render automatic SSL)
- ✅ JWT authentication for protected routes
- ✅ Password hashing with Werkzeug
- ✅ Environment variables for secrets
- ✅ CORS configured for API access
