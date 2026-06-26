import re

file_path = "src/pages/CandidateDashboardPage.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make a backup
with open(file_path + ".bak", "w", encoding="utf-8") as f:
    f.write(content)

# Regex replacements
replacements = [
    # General Theme
    (r'"linear-gradient\(180deg, #f8fafc 0%, #e2e8f0 100%\)"', '"#fafafa"'),
    (r'"linear-gradient\(135deg, #1e3a8a 0%, #312e81 100%\)"', '"#000000"'),
    (r'"linear-gradient\(135deg, #4f46e5 0%, #7c3aed 100%\)"', '"#000000"'),
    (r'"linear-gradient\(135deg, #2563eb, #4f46e5\)"', '"#000000"'),

    # Backgrounds and standard colors
    (r'"#f1f5f9"', '"#fafafa"'), 
    (r'"#2563eb"', '"#000000"'), 
    (r'"#4f46e5"', '"#000000"'), 
    (r'"#3b82f6"', '"#000000"'), 
    (r'"#6366f1"', '"#000"'), 
    
    # Hover states
    (r'"#1d4ed8"', '"#333333"'), 
    (r'"#4338ca"', '"#333333"'),

    # Purple elements
    (r'"#8b5cf6"', '"#000"'),
    (r'"#7c3aed"', '"#333333"'),
    
    # Text colors
    (r'"text-blue-200"', '"text-gray-300"'),
    (r'"text-blue-100"', '"text-gray-200"'),
    (r'"#1e3a8a"', '"#111111"'),
]

new_content = content
for pattern, replacement in replacements:
    new_content = re.sub(pattern, replacement, new_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Theme updated in CandidateDashboardPage.jsx")
