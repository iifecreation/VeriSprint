"""
Operator commands, run inside the API container:

    docker compose -f docker-compose.prod.yml --env-file .env exec api python -m app.cli create-superadmin

create-superadmin  Create the operator (super_admin) account used to sign in
                   to the Operator Console. Prompts for the password so it
                   never appears in shell history or process lists.
"""
import asyncio
import getpass
import sys

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select

from app.auth.security import hash_password
from app.db.models import User, UserRole
from app.db.session import AsyncSessionLocal
from app.schemas import SetPasswordRequest


async def create_superadmin() -> int:
    email = input("Operator email: ").strip().lower()
    try:
        from pydantic import EmailStr

        TypeAdapter(EmailStr).validate_python(email)
    except ValidationError:
        print("That doesn't look like a valid email address.")
        return 1

    password = getpass.getpass("Password (min 10 characters): ")
    if password != getpass.getpass("Repeat password: "):
        print("Passwords don't match.")
        return 1
    try:
        SetPasswordRequest(token="cli", password=password)  # same strength rules as the app
    except ValidationError as exc:
        print(f"Password rejected: {exc.errors()[0]['msg']}")
        return 1

    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing is not None:
            print("An account with that email already exists — nothing changed.")
            return 1
        db.add(User(email=email, password_hash=hash_password(password), role=UserRole.SUPER_ADMIN, name="Operator"))
        await db.commit()
    print(f"Created operator account {email}. Sign in at the Operator Console (admin.<your domain>).")
    return 0


COMMANDS = {"create-superadmin": create_superadmin}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        sys.exit(2)
    sys.exit(asyncio.run(COMMANDS[sys.argv[1]]()))


if __name__ == "__main__":
    main()
