export const handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders };
  }

  try {
    const category = event.queryStringParameters.category || "nasional";

    // ================================
    // 1. MULTI RSS PORTAL INDONESIA
    // ================================
    const SOURCES = {
      nasional: [
        "https://www.cnnindonesia.com/nasional/rss",
        "https://rss.tempo.co/nasional",
        "https://www.antaranews.com/rss/nasional",
        "https://rss.kompas.com/nasional",
        "https://rss.detik.com/index.php/detikcom_nasional",
        "https://www.kumparan.com/rss/news"
      ],
      politik: [
        "https://www.cnnindonesia.com/politik/rss",
        "https://www.antaranews.com/rss/politik",
        "https://rss.kompas.com/megapolitan",
        "https://rss.detik.com/index.php/detikcom_politik"
      ],
      ekonomi: [
        "https://www.cnnindonesia.com/ekonomi/rss",
        "https://rss.tempo.co/ekonomi",
        "https://www.antaranews.com/rss/ekonomi",
        "https://rss.kompas.com/ekonomi",
        "https://rss.detik.com/index.php/finance"
      ],
      teknologi: [
        "https://www.cnnindonesia.com/teknologi/rss",
        "https://rss.tempo.co/tekno",
        "https://www.antaranews.com/rss/tekno",
        "https://rss.kompas.com/tekno"
      ]
    };

    const selectedSources = SOURCES[category] || SOURCES["nasional"];

    // ================================
    // PARSER TANPA DEPENDENCY
    // ================================
    function getBetween(text, start, end) {
      const s = text.indexOf(start);
      if (s === -1) return null;
      const e = text.indexOf(end, s + start.length);
      if (e === -1) return null;
      return text.substring(s + start.length, e).trim();
    }

    async function fetchRSS(url) {
      try {
        const xml = await fetch(url).then(r => r.text());
        if (xml.startsWith("<!DOCTYPE html>")) return [];

        const items = xml.split("<item>").slice(1, 6);

        return items.map(item => ({
          title: getBetween(item, "<title>", "</title>") || "",
          description: getBetween(item, "<description>", "</description>") || "",
          link: getBetween(item, "<link>", "</link>") || "",
          image:
            getBetween(item, 'url="', '"') ||
            getBetween(item, "<img>", "</img>") ||
            "https://placehold.co/120x80",
          source:
            url.includes("cnn") ? "CNN Indonesia" :
            url.includes("tempo") ? "Tempo" :
            url.includes("antaranews") ? "Antara" :
            url.includes("kompas") ? "Kompas" :
            url.includes("detik") ? "Detik" :
            url.includes("kumparan") ? "Kumparan" :
            "Portal Indonesia"
        }));
      } catch {
        return [];
      }
    }

    // ================================
    // AMBIL SEMUA RSS
    // ================================
    let list = [];

    for (const url of selectedSources) {
      const items = await fetchRSS(url);
      list.push(...items);
    }

    // filter invalid
    list = list.filter(n => n.title && n.description);

    // randomizer
    list = list
      .map(v => ({ sort: Math.random(), value: v }))
      .sort((a, b) => a.sort - b.sort)
      .map(v => v.value);

    // ambil 12 berita
    const finalNews = list.slice(0, 12);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(finalNews)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
