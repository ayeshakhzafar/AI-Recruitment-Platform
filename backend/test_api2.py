import requests
import jwt
from datetime import datetime, timedelta

# Create valid token
JWT_SECRET = "recruto-local-dev-only-change-me"
payload = {"uid": 1, "role": "candidate", "exp": datetime.utcnow() + timedelta(days=1)}
token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

url = "http://127.0.0.1:8000/api/candidate/apply-with-cv"
data = {"job_id": "job_123", "name": "Fake Name", "email": "fake@me.com"}
headers = {"Authorization": f"Bearer {token}"}

r = requests.post(url, data=data, headers=headers)
print("Status:", r.status_code)
print("Response:", r.text)
