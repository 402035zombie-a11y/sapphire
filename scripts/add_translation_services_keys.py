import os
ROOT = 'C:/Users/DELL/BookReader/i18n'
T = {
 'af': ["Vertaaldienste", "Gratis vertaaldienste en hul huidige limiete. Limiete word outomaties teruggestel."],
 'ar': ["خدمات الترجمة", "خدمات الترجمة المجانية وحدودها الحالية. تُعاد الحدود تلقائيًا."],
 'bg': ["Услуги за превод", "Безплатни услуги за превод и текущите им лимити. Лимитите се нулират автоматично."],
 'ca': ["Serveis de traducció", "Serveis de traducció gratuïts i els seus límits actuals. Els límits es restableixen automàticament."],
 'cs': ["Překladové služby", "Bezplatné překladové služby a jejich aktuální limity. Limity se obnovují automaticky."],
 'cy': ["Gwasanaethau cyfieithu", "Gwasanaethau cyfieithu am ddim a'u terfynau cyfredol. Mae terfynau'n ailosod yn awtomatig."],
 'da': ["Oversættelsestjenester", "Gratis oversættelsestjenester og deres aktuelle grænser. Grænser nulstilles automatisk."],
 'de': ["Übersetzungsdienste", "Kostenlose Übersetzungsdienste und ihre aktuellen Limits. Limits werden automatisch zurückgesetzt."],
 'el': ["Υπηρεσίες μετάφρασης", "Δωρεάν υπηρεσίες μετάφρασης και τα τρέχοντα όριά τους. Τα όρια επαναφέρονται αυτόματα."],
 'es': ["Servicios de traducción", "Servicios de traducción gratuitos y sus límites actuales. Los límites se restablecen automáticamente."],
 'et': ["Tõlketeenused", "Tasuta tõlketeenused ja nende praegused limiidid. Limiidid lähtestuvad automaatselt."],
 'eu': ["Itzulpen-zerbitzuak", "Doako itzulpen-zerbitzuak eta haien egungo mugak. Mugak automatikoki berrezartzen dira."],
 'fa': ["خدمات ترجمه", "خدمات ترجمه رایگان و محدودیت‌های فعلی آن‌ها. محدودیت‌ها به‌صورت خودکار بازنشانی می‌شوند."],
 'fi': ["Käännöspalvelut", "Ilmaiset käännöspalvelut ja niiden nykyiset rajat. Rajat nollautuvat automaattisesti."],
 'fr': ["Services de traduction", "Services de traduction gratuits et leurs limites actuelles. Les limites se réinitialisent automatiquement."],
 'gl': ["Servizos de tradución", "Servizos de tradución gratuítos e os seus límites actuais. Os límites restablécense automaticamente."],
 'he': ["שירותי תרגום", "שירותי תרגום חינמיים והמגבלות הנוכחיות שלהם. המגבלות מתאפסות אוטומטית."],
 'hi': ["अनुवाद सेवाएँ", "मुफ़्त अनुवाद सेवाएँ और उनकी वर्तमान सीमाएँ। सीमाएँ स्वचालित रूप से रीसेट होती हैं।"],
 'hr': ["Usluge prevođenja", "Besplatne usluge prevođenja i njihova trenutna ograničenja. Ograničenja se automatski resetiraju."],
 'hu': ["Fordítási szolgáltatások", "Ingyenes fordítási szolgáltatások és aktuális korlátaik. A korlátok automatikusan visszaállnak."],
 'id': ["Layanan terjemahan", "Layanan terjemahan gratis dan batasannya saat ini. Batasan direset secara otomatis."],
 'is': ["Þýðingarþjónustur", "Ókeypis þýðingarþjónustur og núverandi takmarkanir þeirra. Takmarkanir endurstillast sjálfkrafa."],
 'it': ["Servizi di traduzione", "Servizi di traduzione gratuiti e i loro limiti attuali. I limiti si azzerano automaticamente."],
 'ja': ["翻訳サービス", "無料の翻訳サービスと現在の制限。制限は自動的にリセットされます。"],
 'ko': ["번역 서비스", "무료 번역 서비스와 현재 한도. 한도는 자동으로 초기화됩니다."],
 'lt': ["Vertimo paslaugos", "Nemokamos vertimo paslaugos ir jų dabartiniai limitai. Limitai atstatomi automatiškai."],
 'lv': ["Tulkošanas pakalpojumi", "Bezmaksas tulkošanas pakalpojumi un to pašreizējie ierobežojumi. Ierobežojumi tiek automātiski atiestatīti."],
 'ms': ["Perkhidmatan terjemahan", "Perkhidmatan terjemahan percuma dan had semasanya. Had ditetapkan semula secara automatik."],
 'nl': ["Vertaaldiensten", "Gratis vertaaldiensten en hun huidige limieten. Limieten worden automatisch gereset."],
 'no': ["Oversettelsestjenester", "Gratis oversettelsestjenester og gjeldende grenser. Grensene tilbakestilles automatisk."],
 'pl': ["Usługi tłumaczenia", "Darmowe usługi tłumaczenia i ich aktualne limity. Limity resetują się automatycznie."],
 'pt': ["Serviços de tradução", "Serviços de tradução gratuitos e seus limites atuais. Os limites são redefinidos automaticamente."],
 'ro': ["Servicii de traducere", "Servicii de traducere gratuite și limitele lor actuale. Limitele se resetează automat."],
 'sk': ["Prekladové služby", "Bezplatné prekladové služby a ich aktuálne limity. Limity sa obnovujú automaticky."],
 'sl': ["Prevajalske storitve", "Brezplačne prevajalske storitve in njihove trenutne omejitve. Omejitve se samodejno ponastavijo."],
 'sr': ["Usluge prevođenja", "Besplatne usluge prevođenja i njihova trenutna ograničenja. Ograničenja se automatski resetuju."],
 'sv': ["Översättningstjänster", "Gratis översättningstjänster och deras nuvarande gränser. Gränserna återställs automatiskt."],
 'sw': ["Huduma za tafsiri", "Huduma za tafsiri bila malipo na vikomo vyake vya sasa. Vikomo huwekwa upya kiotomatiki."],
 'th': ["บริการแปลภาษา", "บริการแปลภาษาฟรีและขีดจำกัดปัจจุบัน ขีดจำกัดจะรีเซ็ตโดยอัตโนมัติ"],
 'tr': ["Çeviri hizmetleri", "Ücretsiz çeviri hizmetleri ve güncel limitleri. Limitler otomatik olarak sıfırlanır."],
 'uk': ["Сервіси перекладу", "Безкоштовні сервіси перекладу та їх поточні ліміти. Ліміти скидаються автоматично."],
 'vi': ["Dịch vụ dịch thuật", "Dịch vụ dịch thuật miễn phí và giới hạn hiện tại. Giới hạn tự động đặt lại."],
 'zh': ["翻译服务", "免费翻译服务及其当前限制。限制会自动重置。"],
}
KEYS = ['Translation services', 'Free translation services and their current limits. Limits reset automatically.']

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
