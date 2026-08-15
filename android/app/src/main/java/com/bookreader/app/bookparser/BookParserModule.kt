package com.bookreader.app.bookparser

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.io.InputStream
import java.util.concurrent.Executors
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import org.json.JSONArray
import org.json.JSONObject

/**
 * BookParserModule — нативний парсинг книг (EPUB/FB2) у власному пулі потоків.
 *
 * Чому нативно: JS-парсинг (jszip + regex) блокує JS-потік і фризить UI на великих EPUB.
 * Тут вся важка робота (unzip + XML) виконується у background-executor, а в JS повертається
 * ОДИН JSON-рядок через JSI-проміс — без покрокового bridging тисяч об'єктів.
 *
 * Структура результату 1:1 з JS-парсером:
 *   { title, author, format, chapters: [{ idx, title, href, contentHtml, charCount }] }
 *
 * Ліцензії: використані ТІЛЬКИ системні API (java.util.zip, org.json) — жодного GPL/AGPL.
 * Readium Mobile (BSD-3-Clause) може бути під'єднаний як drop-in заміна тіла parseEpubSync()
 * (див. native/README.md) — публічний контракт модуля при цьому не змінюється.
 */
@ReactModule(name = BookParserModule.NAME)
class BookParserModule(reactContext: ReactApplicationContext) :
    NativeBookParserSpec(reactContext) {

  companion object {
    const val NAME = "NativeBookParser"
    private const val MAX_ENTRY_BYTES = 32L * 1024 * 1024 // антизіп-бомба, на главу
  }

  // 2 потоки: парсинг однієї книги + запас, щоб не плодити потоки на кожен виклик.
  private val executor = Executors.newFixedThreadPool(2)

  override fun getName(): String = NAME

  override fun isAvailable(): Boolean = true

  override fun parseEpub(path: String, promise: Promise) {
    executor.execute {
      try {
        promise.resolve(parseEpubSync(normalizePath(path)).toString())
      } catch (e: Throwable) {
        promise.reject("EPUB_PARSE_ERROR", e.message ?: "epub parse failed", e)
      }
    }
  }

  override fun parseFb2(path: String, promise: Promise) {
    executor.execute {
      try {
        promise.resolve(parseFb2Sync(normalizePath(path)).toString())
      } catch (e: Throwable) {
        promise.reject("FB2_PARSE_ERROR", e.message ?: "fb2 parse failed", e)
      }
    }
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  // ---------------------------------------------------------------- helpers

  /** file:// URI від expo-document-picker/SAF → звичайний шлях. */
  private fun normalizePath(raw: String): String {
    var p = raw
    if (p.startsWith("file://")) p = p.removePrefix("file://")
    p = java.net.URLDecoder.decode(p, "UTF-8")
    if (!File(p).exists()) throw IllegalArgumentException("file not found: $p")
    return p
  }

  private fun readEntry(zip: ZipFile, entry: ZipEntry): String {
    if (entry.size > MAX_ENTRY_BYTES) throw IllegalStateException("entry too large: ${entry.name}")
    val stream: InputStream = zip.getInputStream(entry)
    return stream.use { it.readBytes().toString(Charsets.UTF_8) }
  }

  private fun findEntry(zip: ZipFile, path: String): ZipEntry? {
    zip.getEntry(path)?.let { return it }
    // Коряві EPUB: різний регістр / зайвий провідний слеш.
    val needle = path.trimStart('/').lowercase()
    val entries = zip.entries()
    while (entries.hasMoreElements()) {
      val e = entries.nextElement()
      if (e.name.trimStart('/').lowercase() == needle) return e
    }
    return null
  }

  private fun resolvePath(baseDir: String, href: String): String {
    val parts = if (baseDir.isEmpty()) mutableListOf() else baseDir.split('/').toMutableList()
    for (seg in href.substringBefore('#').split('/')) {
      when {
        seg.isEmpty() || seg == "." -> {}
        seg == ".." -> if (parts.isNotEmpty()) parts.removeAt(parts.size - 1)
        else -> parts.add(seg)
      }
    }
    return parts.joinToString("/")
  }

  private fun decodeEntities(s: String): String =
      s.replace("&lt;", "<")
          .replace("&gt;", ">")
          .replace("&quot;", "\"")
          .replace("&apos;", "'")
          .replace("&#39;", "'")
          .replace("&#039;", "'")
          .replace("&nbsp;", " ")
          .replace("&amp;", "&")

  /** XHTML → чистий текст, семантика збігається з stripHtml() у services/epubParser.ts. */
  private fun stripHtml(html: String): String {
    var t = html.replace(Regex("(?is)<script.*?</script>"), " ")
    t = t.replace(Regex("(?is)<style.*?</style>"), " ")
    t = t.replace(Regex("(?is)<!--.*?-->"), " ")
    t = t.replace(Regex("(?i)<\\s*/?\\s*(p|div|br|h[1-6]|li)\\s*/?\\s*>"), "\n")
    t = t.replace(Regex("<[^>]+>"), " ")
    t = decodeEntities(t)
    t = t.replace(Regex("[ \\t]+"), " ")
    t = t.replace(Regex("\\n{2,}"), "\n")
    return t.trim()
  }

  private fun firstMatch(xml: String, re: Regex): String? =
      re.find(xml)?.groupValues?.getOrNull(1)?.let { decodeEntities(it.trim()) }?.takeIf { it.isNotEmpty() }

  private fun chapterJson(idx: Int, title: String, href: String, text: String): JSONObject =
      JSONObject().apply {
        put("idx", idx)
        put("title", title)
        put("href", href)
        put("contentHtml", text)
        put("charCount", text.length)
      }

  // ------------------------------------------------------------------ EPUB

  private fun parseEpubSync(path: String): JSONObject {
    ZipFile(File(path)).use { zip ->
      // 1. container.xml → шлях до OPF
      val container =
          findEntry(zip, "META-INF/container.xml")
              ?: throw IllegalStateException("not an EPUB: META-INF/container.xml missing")
      val containerXml = readEntry(zip, container)
      val opfPath =
          firstMatch(containerXml, Regex("(?i)full-path\\s*=\\s*\"([^\"]+)\""))
              ?: throw IllegalStateException("OPF path not found")
      val opfEntry = findEntry(zip, opfPath) ?: throw IllegalStateException("OPF not found: $opfPath")
      val opf = readEntry(zip, opfEntry)
      val baseDir = opfPath.substringBeforeLast('/', "")

      // 2. Метадані
      val title = firstMatch(opf, Regex("(?is)<dc:title[^>]*>(.*?)</dc:title>"))
          ?: firstMatch(opf, Regex("(?is)<title[^>]*>(.*?)</title>"))
          ?: File(path).nameWithoutExtension
      val author = firstMatch(opf, Regex("(?is)<dc:creator[^>]*>(.*?)</dc:creator>")) ?: ""

      // 3. manifest: id → href
      val manifest = HashMap<String, String>()
      for (m in Regex("(?is)<item\\b[^>]*>").findAll(opf)) {
        val tag = m.value
        val id = firstMatch(tag, Regex("(?i)\\bid\\s*=\\s*\"([^\"]+)\""))
        val href = firstMatch(tag, Regex("(?i)\\bhref\\s*=\\s*\"([^\"]+)\""))
        if (id != null && href != null) manifest[id] = href
      }

      // 4. spine — порядок читання
      val spineIds = ArrayList<String>()
      val spineBlock = Regex("(?is)<spine\\b.*?</spine>").find(opf)?.value ?: ""
      for (m in Regex("(?is)<itemref\\b[^>]*>").findAll(spineBlock)) {
        firstMatch(m.value, Regex("(?i)idref\\s*=\\s*\"([^\"]+)\""))?.let { spineIds.add(it) }
      }

      // 5. Назви глав з nav/ncx (fallback — <h1..h3> у самій главі, далі "Chapter N")
      val tocTitles = readTocTitles(zip, baseDir, manifest)

      val chapters = JSONArray()
      var idx = 0
      val ids = if (spineIds.isNotEmpty()) spineIds else manifest.keys.toList()
      for (id in ids) {
        val href = manifest[id] ?: continue
        if (!Regex("(?i)\\.(x?html?|xht)(#.*)?$").containsMatchIn(href)) continue
        val full = resolvePath(baseDir, href)
        val entry = findEntry(zip, full) ?: continue
        val raw = try {
          readEntry(zip, entry)
        } catch (e: Throwable) {
          continue // коряву главу пропускаємо, книгу не валимо
        }
        val text = stripHtml(raw)
        if (text.isEmpty()) continue
        val chTitle =
            tocTitles[full]
                ?: firstMatch(raw, Regex("(?is)<h[1-3][^>]*>(.*?)</h[1-3]>"))?.let { stripHtml(it) }
                ?: "Chapter ${idx + 1}"
        chapters.put(chapterJson(idx, chTitle, full, text))
        idx++
      }
      if (chapters.length() == 0) throw IllegalStateException("EPUB has no readable chapters")

      return JSONObject().apply {
        put("title", title)
        put("author", author)
        put("format", "epub")
        put("chapters", chapters)
      }
    }
  }

  /** Назви глав: EPUB3 nav.xhtml або EPUB2 toc.ncx. Ключ — повний шлях у zip. */
  private fun readTocTitles(
      zip: ZipFile,
      baseDir: String,
      manifest: Map<String, String>
  ): Map<String, String> {
    val out = HashMap<String, String>()
    val candidates =
        manifest.values.filter {
          it.endsWith(".ncx", true) || it.contains("nav", true) || it.contains("toc", true)
        }
    for (href in candidates) {
      val entry = findEntry(zip, resolvePath(baseDir, href)) ?: continue
      val xml = try { readEntry(zip, entry) } catch (e: Throwable) { continue }
      // EPUB2: <navPoint><navLabel><text>T</text></navLabel><content src="h"/>
      for (m in Regex("(?is)<navPoint\\b.*?</navPoint>").findAll(xml)) {
        val t = firstMatch(m.value, Regex("(?is)<text[^>]*>(.*?)</text>")) ?: continue
        val src = firstMatch(m.value, Regex("(?i)src\\s*=\\s*\"([^\"]+)\"")) ?: continue
        out.putIfAbsent(resolvePath(baseDir, src), t)
      }
      // EPUB3: <a href="h">T</a>
      for (m in Regex("(?is)<a\\b[^>]*href\\s*=\\s*\"([^\"]+)\"[^>]*>(.*?)</a>").findAll(xml)) {
        val src = m.groupValues[1]
        val t = stripHtml(m.groupValues[2])
        if (t.isNotEmpty()) out.putIfAbsent(resolvePath(baseDir, src), t)
      }
    }
    return out
  }

  // ------------------------------------------------------------------- FB2

  private fun parseFb2Sync(path: String): JSONObject {
    val xml = File(path).readText(Charsets.UTF_8)
    val title =
        firstMatch(xml, Regex("(?is)<book-title[^>]*>(.*?)</book-title>"))
            ?: File(path).nameWithoutExtension
    val first = firstMatch(xml, Regex("(?is)<first-name[^>]*>(.*?)</first-name>")) ?: ""
    val last = firstMatch(xml, Regex("(?is)<last-name[^>]*>(.*?)</last-name>")) ?: ""
    val author = listOf(first, last).filter { it.isNotEmpty() }.joinToString(" ")

    val body = Regex("(?is)<body(?![^>]*name\\s*=\\s*\"notes\").*?</body>").find(xml)?.value ?: xml
    val chapters = JSONArray()
    var idx = 0
    for (m in Regex("(?is)<section\\b.*?</section>").findAll(body)) {
      val text = stripHtml(m.value)
      if (text.isEmpty()) continue
      val chTitle =
          firstMatch(m.value, Regex("(?is)<title[^>]*>(.*?)</title>"))?.let { stripHtml(it) }
              ?: "Chapter ${idx + 1}"
      chapters.put(chapterJson(idx, chTitle, idx.toString(), text))
      idx++
    }
    if (chapters.length() == 0) {
      val text = stripHtml(body)
      if (text.isEmpty()) throw IllegalStateException("FB2 has no readable text")
      chapters.put(chapterJson(0, title, "0", text))
    }
    return JSONObject().apply {
      put("title", title)
      put("author", author)
      put("format", "fb2")
      put("chapters", chapters)
    }
  }
}
