import { XMLParser } from "fast-xml-parser";

const SOURCES = [
  { name: "Kompas", url: "https://rss.kompas.com/rss/nasional" },
  { name: "Detik", url: "https://rss.detik.com/index.php/nasional" },
  { name: "CNN Indonesia", url: "https://www.cnnindonesia.com/nasional/rss" },
  { name: "Tempo", url: "https://rss.tempo.co/nasional" }
];

export const handler = async () => {
  const parser = new XMLParser();
  let allNews = [];

  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const json = parser.parse(xml);

      const items = json?.rss?.channel?.item || [];

      items.slice(0, 5).forEach(item => {
        allNews.push({
          title: item.title,
          link: item.link,
          source: source.name,
          published: item.pubDate || "-"
        });
      });

    } catch (err) {
      // kalau satu media gagal, JANGAN hentikan semuanya
      console.error(`Gagal fetch dari ${source.name}`);
    }
  }

  // fallback jika SEMUA media gagal
  if (allNews.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify([
        {
          title:
            "Berita nasional tidak dapat dimuat sementara. Silakan coba lagi.",
          link: "#",
          source: "Sistem",
          published: "-"
        }
      ])
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(allNews)
  };
};
