# Copie la page web dans l'appli, avec les polices en local pour marcher hors ligne.
import re, urllib.request
s = open('../web/index.html', encoding='utf-8').read()
s = re.sub(r'<link rel="(preconnect|manifest|icon|apple-touch-icon)"[^>]*>\n', '', s)
s = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n', '', s)
polices = [('Alegreya SC', 500, 'sc-500', 'alegreyasc/v28/taiTGmRtCJ62-O0HhNEa-ZZc-oU2SKo'),
           ('Alegreya SC', 700, 'sc-700', 'alegreyasc/v28/taiTGmRtCJ62-O0HhNEa-ZYU_IU2SKo'),
           ('Alegreya Sans', 400, 'sans-400', 'alegreyasans/v28/5aUz9_-1phKLFgshYDvh6Vwt7VptvQ'),
           ('Alegreya Sans', 500, 'sans-500', 'alegreyasans/v28/5aUu9_-1phKLFgshYDvh6Vwt5alOqEp2iw'),
           ('Alegreya Sans', 700, 'sans-700', 'alegreyasans/v28/5aUu9_-1phKLFgshYDvh6Vwt5eFIqEp2iw')]
ff = ''
for fam, w, f, u in polices:
    urllib.request.urlretrieve(f'https://fonts.gstatic.com/s/{u}.woff2', f'assets/fonts/{f}.woff2')
    ff += f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/{f}.woff2) format('woff2')}}\n"
i = s.index('<style>\n/*')
s = s[:i] + '<style>\n' + ff + s[i + len('<style>\n'):]
open('assets/index.html', 'w', encoding='utf-8').write(s)
