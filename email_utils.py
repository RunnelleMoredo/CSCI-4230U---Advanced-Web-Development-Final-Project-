"""
Email utility for sending password reset emails via Gmail SMTP.
Configure the following environment variables:
- MAIL_USERNAME: Your Gmail address
- MAIL_PASSWORD: Your Gmail App Password (not your regular password)
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from itsdangerous import URLSafeTimedSerializer
from flask import current_app, url_for


def get_serializer():
    """Get the URL-safe timed serializer for generating tokens."""
    secret_key = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
    return URLSafeTimedSerializer(secret_key)


def generate_reset_token(email):
    """Generate a password reset token for the given email."""
    serializer = get_serializer()
    return serializer.dumps(email, salt='password-reset-salt')


def verify_reset_token(token, max_age=3600):
    """
    Verify and decode a password reset token.
    Returns the email if valid, None if expired or invalid.
    max_age is in seconds (default 1 hour).
    """
    serializer = get_serializer()
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=max_age)
        return email
    except Exception:
        return None


def send_reset_email(to_email, reset_url):
    """
    Send a password reset email via Gmail SMTP.
    
    Required environment variables:
    - MAIL_USERNAME: Your Gmail address
    - MAIL_PASSWORD: Your Gmail App Password
    """
    mail_username = os.environ.get('MAIL_USERNAME')
    mail_password = os.environ.get('MAIL_PASSWORD')
    
    # If email not configured, print to console for demo purposes
    if not mail_username or not mail_password:
        print("\n" + "="*60)
        print("📧 PASSWORD RESET EMAIL (Demo Mode - Email not configured)")
        print("="*60)
        print(f"To: {to_email}")
        print(f"Reset URL: {reset_url}")
        print("="*60 + "\n")
        return True
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'CoreSync - Password Reset Request'
    msg['From'] = mail_username
    msg['To'] = to_email
    
    # Plain text version
    text = f"""
CoreSync Password Reset

You have requested to reset your password. Click the link below to reset it:

{reset_url}

This link will expire in 1 hour.

If you did not request this reset, please ignore this email.

- The CoreSync Team
"""
    
    # HTML version
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2b6cee, #1e4fd8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; background: #2b6cee; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏋️ CoreSync</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You have requested to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="{reset_url}" class="button">Reset My Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">
                {reset_url}
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>© 2024 CoreSync. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
    
    msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))
    
    try:
        # Connect to Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(mail_username, mail_password)
        server.sendmail(mail_username, to_email, msg.as_string())
        server.quit()
        print(f"✅ Password reset email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False
