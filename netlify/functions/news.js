export const handler = async (event) => {
  try {
    const allowedCategories = {
      nasional: "https://rss.tempo.co/nasional",
      politik: "https://rss.tempo.co/politik",
      ekonomi: "https://rss.tempo.co/ekonomi",
      teknologi: "https://rss.tempo.co/tekno"
    };

    const category = event.queryStringParameters.category || "nasional";

    if (!allowedCategories[category]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Kategori tidak valid" }),
      };
    }

    const rssURL = allowedCategories[category];

    const xmlText = await fetch(rssURL).then(r => r.text());

    function getBetween(text, start, end) {
      const s = text.indexOf(start);
      if (s === -1) return null;
      const e = text.indexOf(end, s + start.length);
      if (e === -1) return null;
      return text.substring(s + start.length, e).trim();
    }

    const items = xmlText.split("<item>").slice(1, 11);

    const results = items.map(itemXML => ({
      title: getBetween(itemXML, "<title>", "</title>") || "",
      description: getBetween(itemXML, "<description>", "</description>") || "",
      image:
        getBetween(itemXML, 'url="', '"') ||
        "https://via.placeholder.com/120x80?text=News"
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Gagal mengambil berita",
        detail: error.message
      })
    };
  }
};
