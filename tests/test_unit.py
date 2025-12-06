"""
Unit tests for Flask application - runs in CI without browser.
"""
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def app():
    """Create application for testing."""
    # Set test environment before importing app
    os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
    os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with flask_app.app_context():
        from models import db
        db.create_all()
        yield flask_app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestHealthcheck:
    """Test basic app functionality."""
    
    def test_app_exists(self, app):
        """Test that app is created."""
        assert app is not None
    
    def test_login_page_loads(self, client):
        """Test login page returns 200."""
        response = client.get('/')
        assert response.status_code == 200
    
    def test_main_dashboard_requires_no_crash(self, client):
        """Test main dashboard doesn't crash."""
        response = client.get('/main_dashboard')
        # May redirect or return 200
        assert response.status_code in [200, 302]
    
    def test_session_page_loads(self, client):
        """Test session page loads."""
        response = client.get('/session')
        assert response.status_code == 200
    
    def test_ai_workout_page_loads(self, client):
        """Test AI workout page loads."""
        response = client.get('/ai_workout')
        assert response.status_code == 200
    
    def test_fitness_level_page_loads(self, client):
        """Test fitness level page loads."""
        response = client.get('/fitness_level')
        assert response.status_code == 200


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    def test_register_endpoint_exists(self, client):
        """Test register endpoint responds."""
        response = client.post('/auth/register', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        # Should be 201 created or 400 if user exists
        assert response.status_code in [201, 400]
    
    def test_login_endpoint_exists(self, client):
        """Test login endpoint responds."""
        response = client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        # 200 if credentials valid, 401 if not
        assert response.status_code in [200, 401]
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields."""
        response = client.post('/auth/login', json={})
        assert response.status_code in [400, 401]


class TestGoalsEndpoints:
    """Test goals API endpoints."""
    
    def test_goals_requires_auth(self, client):
        """Test goals endpoint requires authentication."""
        response = client.get('/goals/')
        # Should be 401 unauthorized or 422 missing token
        assert response.status_code in [401, 422]
    
    def test_create_goal_requires_auth(self, client):
        """Test creating goal requires authentication."""
        response = client.post('/goals/', json={
            'title': 'Test Goal',
            'description': 'Test Description'
        })
        assert response.status_code in [401, 422]


class TestWorkoutEndpoints:
    """Test workout API endpoints."""
    
    def test_workout_search_requires_auth(self, client):
        """Test workout search requires auth."""
        response = client.get('/workout/search?q=bench')
        assert response.status_code in [401, 422]
    
    def test_workout_all_requires_auth(self, client):
        """Test get all workouts requires auth."""
        response = client.get('/workout/all')
        assert response.status_code in [401, 422]


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
