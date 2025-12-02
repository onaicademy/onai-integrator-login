import requests
import json

# Fetch Figma design
response = requests.get(
    'https://api.figma.com/v1/files/hRsVtVQjYfVDCRNvu3QApw/nodes?ids=3-12456',
    headers={'X-Figma-Token': 'FIGMA_TOKEN_HIDDEN'}
)

data = response.json()
node = data['nodes']['3:12456']['document']

print('='*60)
print('FIGMA DESIGN SPECIFICATIONS')
print('='*60)

# Layout info
bbox = node['absoluteBoundingBox']
print(f'\nDIMENSIONS:')
print(f'  Width: {bbox["width"]}px')
print(f'  Height: {bbox["height"]}px')

# Background layers
print(f'\nBACKGROUND LAYERS:')
for i, child in enumerate(node.get('children', [])[:5]):
    print(f'  {i+1}. {child["name"]} ({child["type"]})')
    if child.get('fills'):
        for fill in child['fills'][:1]:
            if fill['type'] == 'GRADIENT_LINEAR':
                print(f'     Type: Linear Gradient')
            elif fill['type'] == 'GRADIENT_RADIAL':
                print(f'     Type: Radial Gradient')
            elif fill['type'] == 'IMAGE':
                print(f'     Type: Image (Leather Texture)')
            elif fill['type'] == 'SOLID':
                c = fill['color']
                print(f'     Color: rgba({int(c["r"]*255)},{int(c["g"]*255)},{int(c["b"]*255)},{c["a"]})')

# Text content
print(f'\nTEXT CONTENT:')
def extract_text(obj, depth=0):
    if isinstance(obj, dict):
        if obj.get('type') == 'TEXT':
            chars = obj.get('characters', '')
            style = obj.get('style', {})
            print(f'  {"  "*depth}"{chars}"')
            print(f'  {"  "*depth}  Font: {style.get("fontFamily")} {style.get("fontWeight")}')
            print(f'  {"  "*depth}  Size: {style.get("fontSize")}px')
            print(f'  {"  "*depth}  Line Height: {style.get("lineHeightPx")}px')
            print(f'  {"  "*depth}  Letter Spacing: {style.get("letterSpacing")}px')
            print(f'  {"  "*depth}  Alignment: {style.get("textAlignHorizontal")}')
            print()
        if 'children' in obj:
            for child in obj['children']:
                extract_text(child, depth)

extract_text(node)

# Colors used
print(f'\nCOLOR PALETTE:')
colors = {}
def collect_colors(obj):
    if isinstance(obj, dict):
        if 'color' in obj and isinstance(obj['color'], dict):
            c = obj['color']
            if all(k in c for k in ['r', 'g', 'b']):
                hex_color = '#{:02X}{:02X}{:02X}'.format(
                    int(c['r']*255),
                    int(c['g']*255),
                    int(c['b']*255)
                )
                alpha = c.get('a', 1.0)
                key = f"{hex_color} (alpha: {alpha:.2f})"
                colors[key] = colors.get(key, 0) + 1
        for v in obj.values():
            if isinstance(v, (dict, list)):
                collect_colors(v)
    elif isinstance(obj, list):
        for item in obj:
            collect_colors(item)

collect_colors(node)
for color, count in sorted(colors.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f'  {color} (used {count}x)')

# Button spec
print(f'\nBUTTON SPECIFICATIONS:')
def find_button(obj):
    if isinstance(obj, dict):
        if obj.get('name') == 'Button' or 'Download' in obj.get('name', ''):
            print(f'  Name: {obj["name"]}')
            if obj.get('cornerRadius'):
                print(f'  Border Radius: {obj["cornerRadius"]}px')
            if obj.get('paddingLeft'):
                print(f'  Padding: {obj["paddingLeft"]}px {obj.get("paddingTop", 0)}px')
            if obj.get('itemSpacing'):
                print(f'  Gap: {obj["itemSpacing"]}px')
            if obj.get('fills'):
                print(f'  Background: Gradient')
        if 'children' in obj:
            for child in obj['children']:
                find_button(child)

find_button(node)

print('\n' + '='*60)
print('ANALYSIS COMPLETE')
print('='*60)
