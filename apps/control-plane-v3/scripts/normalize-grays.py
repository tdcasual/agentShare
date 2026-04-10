import os
import re

base_dir = "apps/control-plane-v3/src"

rules = [
    (r'text-gray-900', 'text-[var(--kw-text)]'),
    (r'text-gray-800', 'text-[var(--kw-text)]'),
    (r'text-gray-700', 'text-[var(--kw-text)]'),
    (r'text-gray-600', 'text-[var(--kw-text-muted)]'),
    (r'text-gray-500', 'text-[var(--kw-text-muted)]'),
    (r'text-gray-400', 'text-[var(--kw-text-muted)]'),
    (r'text-gray-300', 'text-[var(--kw-border)]'),
    (r'text-gray-200', 'text-[var(--kw-border)]'),
    (r'text-gray-100', 'text-[var(--kw-surface-alt)]'),
    (r'placeholder:text-gray-400', 'placeholder:text-[var(--kw-text-muted)]'),
    (r'placeholder:text-gray-500', 'placeholder:text-[var(--kw-text-muted)]'),
    # hover bg fixes
    (r'hover:bg-gray-100', 'hover:bg-[var(--kw-surface-alt)]'),
    (r'hover:bg-gray-50', 'hover:bg-[var(--kw-surface-alt)]'),
    # specific backgrounds
    (r'bg-gray-50', 'bg-[var(--kw-surface-alt)]'),
    (r'bg-gray-100', 'bg-[var(--kw-surface-alt)]'),
]

changed_files = 0
for root, dirs, files in os.walk(base_dir):
    for name in files:
        if name.endswith(('.ts', '.tsx')):
            path = os.path.join(root, name)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            original = content
            for pattern, repl in rules:
                content = re.sub(pattern, repl, content)
            if content != original:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                changed_files += 1
                print(f"Updated {path}")

print(f"\nDone. Changed {changed_files} files.")
