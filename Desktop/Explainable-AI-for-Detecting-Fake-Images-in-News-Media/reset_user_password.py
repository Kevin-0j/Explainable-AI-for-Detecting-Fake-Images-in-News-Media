from getpass import getpass

from backend.app import create_app
from backend.extensions import bcrypt, db
from backend.models import User


def main():
    app = create_app()
    email = input("User email: ").strip()
    if not email:
        print("Email is required")
        return

    new_password = getpass("New password: ").strip()
    if not new_password:
        print("Password cannot be blank")
        return

    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print("User not found")
            return

        user.password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
        db.session.add(user)
        db.session.commit()
        print(f"Password updated successfully for {email}")


if __name__ == "__main__":
    main()
