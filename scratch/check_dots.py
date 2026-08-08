import re

with open(r'c:\Users\libin\Desktop\services\app\provider\[id].tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find all text between JSX tags that is not white space and not inside braces
# We can do a basic parse or check for single characters like '.'
# Let's search for any '.' character and print its context
for match in re.finditer(r'\.', content):
    start = max(0, match.start() - 30)
    end = min(len(content), match.end() + 30)
    print(f"Index {match.start()}: {repr(content[start:end])}")
