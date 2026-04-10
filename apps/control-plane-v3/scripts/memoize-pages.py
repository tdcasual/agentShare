import re
import os

files = [
    'apps/control-plane-v3/src/app/tasks/page.tsx',
    'apps/control-plane-v3/src/app/assets/page.tsx',
    'apps/control-plane-v3/src/app/settings/page.tsx',
    'apps/control-plane-v3/src/app/identities/page.tsx',
    'apps/control-plane-v3/src/app/tokens/page.tsx',
    'apps/control-plane-v3/src/app/reviews/page.tsx',
    'apps/control-plane-v3/src/app/inbox/page.tsx',
    'apps/control-plane-v3/src/app/runs/page.tsx',
    'apps/control-plane-v3/src/app/playbooks/page.tsx',
    'apps/control-plane-v3/src/app/marketplace/page.tsx',
    'apps/control-plane-v3/src/app/approvals/page.tsx',
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add memo import if not present
    if 'memo' not in content.split('\n')[0:10].__str__() or "from 'react'" in content:
        # Check if memo is already imported from react
        if 'memo' not in content:
            content = content.replace("from 'react';", "from 'react'\nimport { memo } from 'react';")
            content = content.replace('from "react";', 'from "react"\nimport { memo } from "react";')
        else:
            # memo might already be in import like { useState, memo }
            pass
    
    # Pattern: function XxxContent() { ... } followed by \n\nfunction or \n\nexport default function or end of file
    pattern = r'function (\w+Content)\(\) \{'
    
    def repl(m):
        name = m.group(1)
        return f'const {name} = memo(function {name}() '
    
    content = re.sub(pattern, repl, content)
    
    # Now we need to close the memo() call. We look for the pattern:
    #   }
    # 
    # function ... or export default function ... or end of file
    # But only for lines that match our memoized functions.
    # A simpler heuristic: find "  };\n\nfunction " or "  };\n\nexport default function "
    # Actually since we changed `function Name() {` to `const Name = memo(function Name() {`,
    # the closing brace of that function needs a `);` after it.
    # We can look for the specific pattern where a block of JSX ends with `  }` followed by blank line and another function/export.
    
    # Let's use a more targeted regex for each file.
    # Match `  }\n\n(function|export default function|interface|const .* =)` and insert `);` before the blank line
    # but only if the preceding context suggests it's our memoized function (i.e., it contains JSX returns)
    
    content = re.sub(
        r'(\n  \})\n\n(function |export default function |interface |const )',
        r'\1);\n\n\2',
        content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {path}")

print("Done.")
