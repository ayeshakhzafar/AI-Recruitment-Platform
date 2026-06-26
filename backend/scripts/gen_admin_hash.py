"""Generate a bcrypt hash for app_users.password_hash (use with 002_seed_admin_example.sql)."""
import sys

from passlib.context import CryptContext

ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python gen_admin_hash.py "YourPassword"')
        sys.exit(1)
    print(ctx.hash(sys.argv[1]))
