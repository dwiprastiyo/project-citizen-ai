import { analyzeWithAI } from "./openrouterService.js";

function calculateRisk(text) {
  const indicators = { A:0, B:0, C:0, D:0, E:0 };

  text.split("\n").forEach(line => {
    if (line.startsWith("A: YA")) indicators.A = 20;
    if (line.startsWith("B: YA")) indicators.B = 20;
    if (line.startsWith("C: YA")) indicators.C = 20;
    if (line.startsWith("D: YA")) indicators.D = 20;
    if (line.startsWith("E: YA")) indicators.E = 20;
  });

  const total =
    indicators.A +
    indicators.B +
    indicators.C +
    indicators.D +
    indicators.E;

  let level = "Rendah";
  if (total >= 60) level = "Tinggi";
  else if (total >= 40) level = "Sedang";

  return { indicators, total, level };
}

export const handler = async (event) => {
  const body = JSON.parse(event.body || "{}");

  if (!body.newsA) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Berita A wajib diisi" })
    };
  }

  try {
    const aiText = await analyzeWithAI(
      body.newsA,
      body.newsB || ""
    );

    const risk = calculateRisk(aiText);

    return {
      statusCode: 200,
      body: JSON.stringify({
        analysis_text: aiText,
        indicators: risk.indicators,
        risk_percentage: risk.total,
        risk_level: risk.level,
        disclaimer:
          "Persentase menunjukkan indikator risiko misinformasi, bukan penentu kebenaran berita."
      })
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Analisis AI gagal" })
    };
  }
};

