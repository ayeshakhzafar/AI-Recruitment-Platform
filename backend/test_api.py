import requests

url = "http://127.0.0.1:8000/api/candidate/apply-with-cv"
data = {"job_id": "job_123", "name": "Test", "email": "test@test.com"}
headers = {"Authorization": "Bearer BAD_TOKEN"}

r = requests.post(url, data=data, headers=headers)
print("Status:", r.status_code)
print("Response:", r.text)
