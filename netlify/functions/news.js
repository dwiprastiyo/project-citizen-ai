import { XMLParser } from "fast-xml-parser";

const SOURCES = [
  { name: "Kompas", url: "https://rss.kompas.com/rss/nasional" },
  { name: "Detik", url: "https://rss.detik.com/index.php/nasional" },
  { name: "CNN Indonesia", url: "https://www.cnnindonesia.com/nasional/rss" },
  { name: "Tempo", url: "https://rss.tempo.co/nasional" }
];

export const handler = async () => {
  try {
    const parser = new XMLParser();
    let allNews = [];

    for (const source of SOURCES) {
      const res = await fetch(source.url);
      const xml = await res.text();
      const json = parser.parse(xml);

      const items = json.rss.channel.item.slice(0, 5).map(item => ({
        title: item.title,
        link: item.link,
        source: source.name,
        published: item.pubDate || "-"
      }));

      allNews = allNews.concat(items);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(allNews)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Gagal mengambil berita Indonesia"
      })
    };
  }
};
