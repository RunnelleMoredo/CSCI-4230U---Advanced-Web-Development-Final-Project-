# Welcome to Coresync!
**Link:** https://coresync-du88.onrender.com/ 

This webapp allows you to sync your core fitness goals with careful planning!

**Created By:** Runnelle Moredo and Almas Alam 

**How to use**
1. Enter a username and password, click signup. Use those credentials to login
   
3. If you are a new to fitness and would like guidance on a workout plan, click **Beginner**, otherwise, click **Intermediate**

	a.) If the beginner tab is clicked, enter your goal, difficulty level, select number of workouts, and optionally add equipment and any limitations, then click **generate AI plan**

	b.) Once complete, click the **click here** button to go to main dashboard.

4. If you would like to create a goal, enter the title and description in the designated field then click **save goal**
   
	a.) You may view your goals by clicking the **View Your Goals** button.

	b.) You may edit, delete, and add new goals in this page.

6. Use the **Exercise Finder** to find exercises that you want to do.
   
	a.) You may add the exercises you want to your workout plan, click **details** if you need help on how to do the exercise

	b.) Click **start workout session** when you want to begin your workout

	c.) From here you may use a timer and add/remove sets to the workout.

	d.) After finishing the workout,  workout history will show in the main dashboard.

8. You may click **Use AI Helper** if you would like to access the generate AI workout plan option

10. Click **Logout** if you are finished


## Important Features
* SQLAlchemy used to store information
* Passwords are hashed for safety
* Endpoints are protected with JWT  authentication
* https://www.exercisedb.dev/ used for workout database
* OpenAI api used for ai workout plan maker

## How to run locally
1. Create and activate virtual environment
2. run "pip install -r requirements.txt"
3. create .env file and setup a "DATABASE_URL", "JWT_SECRET_KEY", "OPENAI_API_KEY"
   
	a.) **Important:** SQLAlchemy is used for database

	b.) secret key can be what you create

	c.) You must generate your own openai api key, must have paid openai plan for it to work

5. run "flask run"
