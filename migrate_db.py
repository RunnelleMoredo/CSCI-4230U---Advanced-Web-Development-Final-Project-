"""
Quick migration script to add missing columns to user_profiles table.
Run with: python migrate_db.py
"""
import sqlite3
import os

# Find the database file
db_paths = ['instance/app.db', 'app.db', 'database.db', 'instance/database.db']
db_path = None

for path in db_paths:
    if os.path.exists(path):
        db_path = path
        break

if not db_path:
    print("Database file not found!")
    exit(1)

print(f"Using database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if columns exist and add them if not
try:
    cursor.execute("PRAGMA table_info(user_profiles)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Existing columns: {columns}")
    
    if 'email' not in columns:
        print("Adding 'email' column...")
        cursor.execute("ALTER TABLE user_profiles ADD COLUMN email VARCHAR(255)")
        print("  Done!")
    else:
        print("Column 'email' already exists")
    
    if 'date_of_birth' not in columns:
        print("Adding 'date_of_birth' column...")
        cursor.execute("ALTER TABLE user_profiles ADD COLUMN date_of_birth DATE")
        print("  Done!")
    else:
        print("Column 'date_of_birth' already exists")
    
    conn.commit()
    print("\nMigration completed successfully!")
    
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
