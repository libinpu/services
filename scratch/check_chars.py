with open(r'c:\Users\libin\Desktop\services\app\provider\[id].tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for idx, line in enumerate(lines):
    if 160 <= idx <= 195:
        print(f"{idx+1}: {repr(line)}")
