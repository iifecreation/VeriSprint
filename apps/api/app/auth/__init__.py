"""Auth service (spec Section 6): password hashing, JWT issuance/verification, and
FastAPI RBAC dependencies. Everything downstream (routers) should import from here
rather than touching JWT/bcrypt directly.
"""
