import re

file_path = "src/pages/HRDashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make a backup
with open(file_path + ".bak2", "w", encoding="utf-8") as f:
    f.write(content)

# Regex replacements to remove emojis/icons visually representing icons
replacements = [
    # General typical emojis used frequently
    (r'✅\s*', ''),
    (r'❌\s*', ''),
    (r'📊\s*', ''),
    (r'⚙️\s*', ''),
    (r'👥\s*', ''),
    (r'📝\s*', ''),
    (r'🧠\s*', ''),
    (r'📋\s*', ''),
    (r'🚀\s*', ''),
    (r'🔍\s*', ''),
    (r'📱\s*', ''),
    (r'💻\s*', ''),
    (r'🔑\s*', ''),
    (r'🔒\s*', ''),
    (r'🗑️\s*', ''),
    (r'⏱️\s*', ''),
    (r'👨‍💻\s*', ''),
    (r'🛡️\s*', ''),
    (r'⚡\s*', ''),
    (r'💬\s*', ''),
    (r'📧\s*', ''),
    (r'🎤\s*', ''),
    (r'🎯\s*', ''),
    (r'👁️\s*', ''),
    (r'✓\s*', ''),
    (r'⚠️\s*', ''),
    
    # We might miss some, let's look for explicit things in buttons
    (r'>\s*✅\s*Approve\s*<', '>Approve<'),
    (r'>\s*❌\s*Reject\s*<', '>Reject<'),
    (r'>\s*👁️\s*View\s*<', '>View<'),
    
    # Graphs are typically generated using div bars or chart.js in HRDashboard. 
    # The user says "make graphs like this kind" assuming they uploaded an image they didn't upload. But they say "light and make graphs like this kind... remove every icon"
    
]

new_content = content
for pattern, replacement in replacements:
    new_content = re.sub(pattern, replacement, new_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Icons removed in HRDashboard.jsx")
