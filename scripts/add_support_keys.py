#!/usr/bin/env python3
# Adds 5 shortened SupportAuthorModal keys to all i18n dicts.
import os, re

ROOT = 'C:/Users/DELL/Sapphire/i18n'

KEYS = [
    'Reading is free forever.',
    'Watch an ad',
    'Donate',
    'Removes ads forever',
    'Not now',
]

T = {
 'af': ["Lees is vir ewig gratis.", "Kyk 'n advertensie", "Skenk", "Verwyder advertensies vir altyd", "Nie nou nie"],
 'ar': ["القراءة مجانية إلى الأبد.", "شاهد إعلانًا", "تبرع", "يزيل الإعلانات إلى الأبد", "ليس الآن"],
 'bg': ["Четенето е безплатно завинаги.", "Гледай реклама", "Дари", "Премахва рекламите завинаги", "Не сега"],
 'ca': ["La lectura és gratis per sempre.", "Mira un anunci", "Dona", "Elimina els anuncis per sempre", "Ara no"],
 'cs': ["Čtení je zdarma navždy.", "Přehrát reklamu", "Přispět", "Odstraní reklamy navždy", "Teď ne"],
 'cy': ["Mae darllen yn rhad ac am ddim am byth.", "Gwyliwch hysbyseb", "Cyfrannu", "Yn dileu hysbysebion am byth", "Dim nawr"],
 'da': ["Læsning er gratis for altid.", "Se en annonce", "Donér", "Fjerner annoncer for altid", "Ikke nu"],
 'de': ["Lesen ist für immer kostenlos.", "Werbung ansehen", "Spenden", "Entfernt Werbung für immer", "Jetzt nicht"],
 'el': ["Η ανάγνωση είναι δωρεάν για πάντα.", "Δες μια διαφήμιση", "Δωρεά", "Αφαιρεί τις διαφημίσεις για πάντα", "Όχι τώρα"],
 'es': ["La lectura es gratis para siempre.", "Ver un anuncio", "Donar", "Elimina los anuncios para siempre", "Ahora no"],
 'et': ["Lugemine on igavesti tasuta.", "Vaata reklaami", "Anneta", "Eemaldab reklaamid igaveseks", "Mitte praegu"],
 'eu': ["Irakurketa betiko doakoa da.", "Ikusi iragarki bat", "Eman dohaintza", "Iragarkiak betiko kentzen ditu", "Orain ez"],
 'fa': ["خواندن برای همیشه رایگان است.", "تماشای تبلیغ", "اهدا", "تبلیغات را برای همیشه حذف می‌کند", "الان نه"],
 'fi': ["Lukeminen on ilmaista ikuisesti.", "Katso mainos", "Lahjoita", "Poistaa mainokset ikuisesti", "Ei nyt"],
 'fr': ["La lecture est gratuite pour toujours.", "Regarder une pub", "Faire un don", "Supprime les publicités pour toujours", "Pas maintenant"],
 'gl': ["A lectura é gratis para sempre.", "Mira un anuncio", "Doar", "Elimina os anuncios para sempre", "Agora non"],
 'he': ["הקריאה חינם לנצח.", "צפה בפרסומת", "תרומה", "מסיר פרסומות לנצח", "לא עכשיו"],
 'hi': ["पढ़ना हमेशा के लिए मुफ़्त है।", "विज्ञापन देखें", "दान करें", "विज्ञापन हमेशा के लिए हटाता है", "अभी नहीं"],
 'hr': ["Čitanje je zauvijek besplatno.", "Pogledaj oglas", "Doniraj", "Zauvijek uklanja oglase", "Ne sada"],
 'hu': ["Az olvasás örökre ingyenes.", "Reklám megtekintése", "Adományozás", "Örökre eltávolítja a hirdetéseket", "Most nem"],
 'id': ["Membaca gratis selamanya.", "Tonton iklan", "Donasi", "Menghapus iklan selamanya", "Nanti saja"],
 'is': ["Lestur er ókeypis að eilífu.", "Horfa á auglýsingu", "Styrkja", "Fjarlægir auglýsingar að eilífu", "Ekki núna"],
 'it': ["La lettura è gratis per sempre.", "Guarda un annuncio", "Dona", "Rimuove gli annunci per sempre", "Non ora"],
 'ja': ["読書はいつまでも無料です。", "広告を見る", "寄付", "広告を完全に削除", "あとで"],
 'ko': ["읽기는 영원히 무료입니다.", "광고 보기", "기부", "광고를 영원히 제거", "나중에"],
 'lt': ["Skaitymas nemokamas amžinai.", "Žiūrėti reklamą", "Paaukoti", "Pašalina skelbimus visam laikui", "Ne dabar"],
 'lv': ["Lasīšana ir bezmaksas uz visiem laikiem.", "Skatīties reklāmu", "Ziedot", "Uz visiem laikiem noņem reklāmas", "Ne tagad"],
 'ms': ["Membaca percuma selamanya.", "Tonton iklan", "Derma", "Mengalih keluar iklan selama-lamanya", "Bukan sekarang"],
 'nl': ["Lezen is voor altijd gratis.", "Bekijk een advertentie", "Doneer", "Verwijdert advertenties voor altijd", "Niet nu"],
 'no': ["Lesing er gratis for alltid.", "Se en annonse", "Doner", "Fjerner annonser for alltid", "Ikke nå"],
 'pl': ["Czytanie jest darmowe na zawsze.", "Obejrzyj reklamę", "Wesprzyj", "Usuwa reklamy na zawsze", "Nie teraz"],
 'pt': ["A leitura é grátis para sempre.", "Ver um anúncio", "Doar", "Remove os anúncios para sempre", "Agora não"],
 'ro': ["Cititul este gratuit pentru totdeauna.", "Vezi o reclamă", "Donează", "Elimină reclamele pentru totdeauna", "Nu acum"],
 'sk': ["Čítanie je navždy zadarmo.", "Pozrieť reklamu", "Prispieť", "Navždy odstráni reklamy", "Teraz nie"],
 'sl': ["Branje je za vedno brezplačno.", "Oglej si oglas", "Doniraj", "Za vedno odstrani oglase", "Ne zdaj"],
 'sr': ["Čitanje je besplatno zauvek.", "Pogledaj reklamu", "Doniraj", "Zauvek uklanja reklame", "Ne sada"],
 'sv': ["Läsning är gratis för alltid.", "Se en annons", "Donera", "Tar bort annonser för alltid", "Inte nu"],
 'sw': ["Kusoma ni bure milele.", "Tazama tangazo", "Changia", "Huondoa matangazo milele", "Sio sasa"],
 'th': ["อ่านฟรีตลอดไป", "ดูโฆษณา", "บริจาค", "ลบโฆษณาอย่างถาวร", "ไม่ใช่ตอนนี้"],
 'tr': ["Okumak sonsuza dek ücretsiz.", "Reklam izle", "Bağış yap", "Reklamları kalıcı olarak kaldırır", "Şimdi değil"],
 'uk': ["Читання безкоштовне назавжди.", "Переглянути рекламу", "Пожертвувати", "Прибирає рекламу назавжди", "Не зараз"],
 'vi': ["Đọc miễn phí mãi mãi.", "Xem quảng cáo", "Quyên góp", "Xóa quảng cáo vĩnh viễn", "Không phải bây giờ"],
 'zh': ["阅读永远免费。", "观看广告", "捐赠", "永久移除广告", "现在不要"],
}

def esc(v):
    return v.replace('\\', '\\\\').replace("'", "\\'")

added = 0
skipped = 0
for code, vals in T.items():
    path = os.path.join(ROOT, code + '.ts')
    if not os.path.exists(path):
        print('MISSING', code)
        continue
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    lines = []
    for i, k in enumerate(KEYS):
        # skip if key already present (idempotent)
        if ("'" + k + "'") in src:
            skipped += 1
            continue
        lines.append("  '%s': '%s'," % (k, esc(vals[i])))
    if not lines:
        continue
    block = '\n'.join(lines) + '\n'
    # insert before final '};'
    idx = src.rfind('};')
    if idx == -1:
        print('NO-END', code)
        continue
    src = src[:idx] + block + src[idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    added += len(lines)

print('added', added, 'keys, skipped-existing', skipped)
