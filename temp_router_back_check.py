import glob
import re
pattern = re.compile('router\\.back\\(')
for path in sorted(glob.glob('app/**/*.tsx', recursive=True)):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if pattern.search(line):
            ctx = ''.join(lines[max(0, i-4):i+3])
            if 'canGoBack' not in ctx:
                print('--- {}:{} ---'.format(path, i))
                print(ctx)
