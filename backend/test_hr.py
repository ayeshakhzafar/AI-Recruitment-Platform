import requests
import jwt
from datetime import datetime, timedelta

# Create valid HR token
JWT_SECRET = "recruto-local-dev-only-change-me"
payload = {"uid": 1, "role": "admin", "exp": datetime.utcnow() + timedelta(days=1)}
token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

url = "http://127.0.0.1:8000/api/hr/fetch-portal-cvs"
headers = {"Authorization": f"Bearer {token}"}

r = requests.post(url, headers=headers)
print("Status:", r.status_code)
print("Response:", r.text)
if r.status_code != 200: exit(1)
