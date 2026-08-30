import os
ROOT = 'C:/Users/DELL/BookReader/i18n'
T = {
 'af': ["Onondersteunde formaat", "Ondersteunde formate: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'ar': ["تنسيق غير مدعوم", "التنسيقات المدعومة: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'bg': ["Неподдържан формат", "Поддържани формати: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'ca': ["Format no compatible", "Formats compatibles: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'cs': ["Nepodporovaný formát", "Podporované formáty: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'cy': ["Fformat heb ei gefnogi", "Fformatau â chymorth: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'da': ["Ikke-understøttet format", "Understøttede formater: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'de': ["Nicht unterstütztes Format", "Unterstützte Formate: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'el': ["Μη υποστηριζόμενη μορφή", "Υποστηριζόμενες μορφές: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'es': ["Formato no compatible", "Formatos compatibles: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'et': ["Toetamata vorming", "Toetatud vormingud: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'eu': ["Onartu gabeko formatua", "Onartutako formatuak: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'fa': ["قالب پشتیبانی‌نشده", "قالب‌های پشتیبانی‌شده: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'fi': ["Ei-tuettu muoto", "Tuetut muodot: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'fr': ["Format non pris en charge", "Formats pris en charge : EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'gl': ["Formato non compatible", "Formatos compatibles: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'he': ["פורמט לא נתמך", "פורמטים נתמכים: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'hi': ["असमर्थित प्रारूप", "समर्थित प्रारूप: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'hr': ["Nepodržani format", "Podržani formati: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'hu': ["Nem támogatott formátum", "Támogatott formátumok: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'id': ["Format tidak didukung", "Format yang didukung: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'is': ["Óstudd skráarsnið", "Studd skráarsnið: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'it': ["Formato non supportato", "Formati supportati: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'ja': ["サポートされていない形式", "対応形式: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'ko': ["지원되지 않는 형식", "지원 형식: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'lt': ["Nepalaikomas formatas", "Palaikomi formatai: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'lv': ["Neatbalstīts formāts", "Atbalstītie formāti: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'ms': ["Format tidak disokong", "Format yang disokong: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'nl': ["Niet-ondersteund formaat", "Ondersteunde formaten: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'no': ["Format som ikke støttes", "Støttede formater: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'pl': ["Nieobsługiwany format", "Obsługiwane formaty: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'pt': ["Formato não suportado", "Formatos suportados: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'ro': ["Format neacceptat", "Formate acceptate: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'sk': ["Nepodporovaný formát", "Podporované formáty: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'sl': ["Nepodprt format", "Podprti formati: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'sr': ["Nepodržan format", "Podržani formati: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'sv': ["Formatet stöds inte", "Format som stöds: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'sw': ["Muundo haujasaidiwa", "Miundo inayosaidiwa: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'th': ["รูปแบบที่ไม่รองรับ", "รูปแบบที่รองรับ: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'tr': ["Desteklenmeyen biçim", "Desteklenen biçimler: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'uk': ["Непідтримуваний формат", "Підтримувані формати: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'vi': ["Định dạng không được hỗ trợ", "Định dạng được hỗ trợ: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
 'zh': ["不支持的格式", "支持的格式: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML"],
}
KEYS = ['Unsupported format', 'Supported formats: EPUB, FB2, TXT, DOCX, ODT, RTF, HTML']

def esc(v):
    return v.replace('\\', '\\\\').replace("'", "\\'")

added = 0
for code, vals in T.items():
    p = os.path.join(ROOT, code + '.ts')
    if not os.path.exists(p):
        print('MISSING', code)
        continue
    src = open(p, encoding='utf-8').read()
    lines = []
    for i, k in enumerate(KEYS):
        if ("'" + k + "'") in src:
            continue
        lines.append("  '%s': '%s'," % (k, esc(vals[i])))
    if not lines:
        continue
    block = '\n'.join(lines) + '\n'
    idx = src.rfind('};')
    src = src[:idx] + block + src[idx:]
    open(p, 'w', encoding='utf-8').write(src)
    added += len(lines)
print('added', added)
