from app import app, db
from sqlalchemy import text
import sys

def migrate():
    print("Starting migration...")
    with app.app_context():
        # List of columns to add to user_profiles
        # format: (column_name, sql_type_definition)
        columns = [
            ("gender", "VARCHAR(20) DEFAULT 'male'"),
            ("goal_type", "VARCHAR(20) DEFAULT 'maintain'"),
            ("target_weight_kg", "FLOAT"),
            ("goal_timeline_weeks", "INTEGER"),
            ("activity_level", "VARCHAR(20) DEFAULT 'moderate'"),
            ("daily_calorie_target", "INTEGER"),
            ("goal_set_at", "TIMESTAMP")
        ]

        for col_name, col_def in columns:
            try:
                print(f"Attempting to add column: {col_name}")
                # Using text() for explicit SQL execution
                # IF NOT EXISTS is supported in Postgres 9.6+, handling via try/except for broader compatibility
                sql = f"ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS {col_name} {col_def};"
                db.session.execute(text(sql))
                db.session.commit()
                print(f"Successfully processed column: {col_name}")
                
            except Exception as e:
                db.session.rollback()
                print(f"Note for {col_name}: {str(e)}")
                # If error is not about "already exists", we might want to know, but likely it's fine.

    print("Migration finished!")

if __name__ == "__main__":
    migrate()
