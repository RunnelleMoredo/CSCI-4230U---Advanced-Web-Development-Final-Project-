import time
from seleniumbase import BaseCase

class FitnessAppTests(BaseCase):

    def open_home(self):
        """Open login page reliably."""
        self.open("http://localhost:5000/")
        self.wait_for_element("#btn_login")

    def login(self, username, password):
        """Perform login flow."""
        self.type("#username", username)
        self.type("#password", password)
        self.click("#btn_login")

        # wait until we navigate to /main
        self.wait_for_element("#btn_logout")
        self.assert_url_contains("/main")

    def signup(self, username, password):
        """Signup helper"""
        self.type("#username", username)
        self.type("#password", password)
        self.click("#btn_signup")
        self.wait_for_element("#auth_message")
        self.assert_text("created", "#auth_message")

    # -------------------------------
    # TEST 1 — THEME TOGGLE
    # -------------------------------
    def test_theme_toggle(self):
        self.open_home()

        initial = self.get_attribute("body", "class")

        self.click("#btn_toggle_theme")
        self.sleep(0.5)

        after = self.get_attribute("body", "class")

        self.assert_not_equal(initial, after)

    # -------------------------------
    # TEST 2 — SIGNUP + LOGIN
    # -------------------------------
    def test_signup_and_login(self):
        self.open_home()

        uname = f"user_{int(time.time())}"
        pwd = "pass123"

        # signup
        self.signup(uname, pwd)

        # login
        self.type("#username", uname)
        self.type("#password", pwd)
        self.click("#btn_login")

        self.wait_for_element("#btn_logout")
        self.assert_url_contains("/main")

    # -------------------------------
    # TEST 3 — GOAL SUCCESS
    # -------------------------------
    def test_create_goal_success(self):
        uname = f"goal_{int(time.time())}"
        pwd = "pass123"

        self.open_home()
        self.signup(uname, pwd)
        self.login(uname, pwd)

        self.type("#text_title", "My Fitness Goal")
        self.type("#text_description", "Run faster and lift heavier.")
        self.click("#btn_submit")

        self.wait_for_text("success", "body")

    # -------------------------------
    # TEST 4 — GOAL MISSING TITLE
    # -------------------------------
    def test_goal_missing_title_shows_error(self):
        uname = f"missing_{int(time.time())}"
        pwd = "pass123"

        self.open_home()
        self.signup(uname, pwd)
        self.login(uname, pwd)

        self.type("#text_description", "This should fail.")
        self.click("#btn_submit")

        self.wait_for_text("Title required", "body")

    # -------------------------------
    # TEST 5 — WORKOUT SEARCH
    # -------------------------------
    def test_workout_search(self):
        uname = f"wk_{int(time.time())}"
        pwd = "pass123"

        self.open_home()
        self.signup(uname, pwd)
        self.login(uname, pwd)

        self.type("#find_workout", "bench")
        self.click("#btn_find_workout")

        self.wait_for_element("#search_results")
        self.sleep(2)  # API fetch delay
        self.assert_text("bench", "#search_results")

    # -------------------------------
    # TEST 6 — START SESSION
    # -------------------------------
    def test_start_session(self):
        uname = f"session_{int(time.time())}"
        pwd = "pass123"

        self.open_home()
        self.signup(uname, pwd)
        self.login(uname, pwd)

        # search exercise
        self.type("#find_workout", "curl")
        self.click("#btn_find_workout")
        self.sleep(2)

        # click first result
        self.wait_for_element("#search_results .workout-card")
        self.click("#search_results .workout-card")

        # check it's added
        self.wait_for_element("#selected_workouts .workout-card")

        # start session
        self.click("#btn_start_session")

        self.wait_for_element("#session_container")
        self.assert_url_contains("/session")

    # -------------------------------
    # TEST 7 — XSS SAFETY
    # -------------------------------
    def test_xss_in_goal_title(self):
        uname = f"xss_{int(time.time())}"
        pwd = "pass123"

        self.open_home()
        self.signup(uname, pwd)
        self.login(uname, pwd)

        payload = "<script>alert('x')</script>"

        self.type("#text_title", payload)
        self.type("#text_description", "XSS test")
        self.click("#btn_submit")

        # app should not execute script
        self.wait_for_text("script", "body")
