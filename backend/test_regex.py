import re

text = "My phone number is +92 300 1234567 and 0300-1234567 or (555) 123-4567 or 0321 1234 567"
phone_pattern = r"(?:\+?\d{1,4}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{0,4}"

phones = [p for p in re.findall(phone_pattern, text) if len(re.sub(r'\D', '', p)) >= 10]
print(phones)
