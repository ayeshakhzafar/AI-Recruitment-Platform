import re

file_path = "src/pages/HRDashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make a backup
with open(file_path + ".bak", "w", encoding="utf-8") as f:
    f.write(content)

# Regex replacements
replacements = [
    # Sidebar Background
    (r'"linear-gradient\(180deg, #020617 0%, #0f172a 55%, #020617 100%\)"', '"#000000"'),
    (r'"rgba\(236, 72, 153, 0\.2\)"', '"rgba(255, 255, 255, 0.15)"'),
    (r'"#ec4899"', '"#ffffff"'), # pink icon -> white icon
    (r'"#e2e8f0"', '"#9ca3af"'), # grey text -> slightly darker grey
    
    # Primary Buttons & Gradients
    (r'"linear-gradient\(135deg, #8b5cf6, #ec4899\)"', '"#000000"'),
    (r'"linear-gradient\(135deg, #667eea 0%, #764ba2 100%\)"', '"#000000"'),
    (r'"linear-gradient\(to right, #0ea5e9, #6366f1\)"', '"#000000"'),
    (r'"linear-gradient\(135deg, #c31432, #240b36\)"', '"#000"'),

    # Backgrounds and standard colors
    (r'"#f1f5f9"', '"#fafafa"'), # Main body background slightly cleaner
    (r'"#2563eb"', '"#000000"'), # Blue buttons -> Black
    (r'"#4f46e5"', '"#000000"'), # Indigo buttons -> Black
    (r'"#3b82f6"', '"#000000"'), # Blue hover -> Black
    (r'"#6366f1"', '"#000"'), # Indigo -> Black
    # Let's keep green buttons EXCEPT if there are huge green primary action buttons
    # Actually, Turing UI uses black for all standard buttons (Submit, Send, Create).
    # Since we want it to look like Turing, let's just make the major buttons black.
    
    # Hover states for black buttons (replace where we had blue hover)
    (r'"#1d4ed8"', '"#333333"'), 
    (r'"#4338ca"', '"#333333"'),

    # Purple elements
    (r'"#8b5cf6"', '"#000"'),
    (r'"#7c3aed"', '"#333333"'),
    
    # Pink elements
    (r'"#f472b6"', '"#000"'),
    
    # Blue status badges
    (r'"#e0e7ff"', '"#f3f4f6"'), # light blue bg -> light grey
    (r'"#dbeafe"', '"#f3f4f6"'),
    (r'"#1e40af"', '"#111111"'), # dark blue text -> black text
    (r'"#c7d2fe"', '"#d1d5db"'), # blue border -> grey border
    
    # Fix green/red active states in sidebars or boxes
    (r'"rgba\(139, 92, 246, 0\.1\)"', '"#f3f4f6"'), # purple highlight -> light grey
]

new_content = content
for pattern, replacement in replacements:
    new_content = re.sub(pattern, replacement, new_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Theme updated in HRDashboard.jsx")
