import re

file_path = "src/pages/HRDashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace prominent emojis with text or remove them
replacements = [
    (r'"📄"', '""'),
    (r'"🏆"', '""'),
    (r'"💼"', '""'),
    (r'✅ ', ''),
    (r'❌ ', ''),
    (r'📧 ', ''),
    (r'⚙️ ', ''),
    (r'📋 ', ''),
    (r'📊 ', ''),
    (r'📝 ', ''),
    (r'💻 ', ''),
    (r'🤖 ', ''),
    (r'🧠 ', ''),
    (r'⏳ ', ''),
    (r'🏆 ', ''),
]

new_content = content
for pattern, replacement in replacements:
    new_content = re.sub(pattern, replacement, new_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Icons stripped from HRDashboard.jsx")
