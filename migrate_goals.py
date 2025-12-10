"""Add goal columns to user_profiles table"""
import sqlite3

# Connect to the database
conn = sqlite3.connect('instance/database.db')
cursor = conn.cursor()

# Add new columns (SQLite allows only one column per ALTER TABLE)
columns_to_add = [
    ("gender", "VARCHAR(20) DEFAULT 'male'"),
    ("goal_type", "VARCHAR(20) DEFAULT 'maintain'"),
    ("target_weight_kg", "FLOAT"),
    ("goal_timeline_weeks", "INTEGER"),
    ("activity_level", "VARCHAR(20) DEFAULT 'moderate'"),
    ("daily_calorie_target", "INTEGER"),
    ("goal_set_at", "DATETIME")
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE user_profiles ADD COLUMN {col_name} {col_type}")
        print(f"Added column: {col_name}")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print(f"Column {col_name} already exists, skipping")
        else:
            print(f"Error adding {col_name}: {e}")

conn.commit()
conn.close()
print("Migration complete!")
