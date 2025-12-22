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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Request body kosong" })
      };
    }

    const { newsA, newsB } = JSON.parse(event.body);

    if (!newsA || newsA.trim() === "") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Berita A wajib diisi" })
      };
    }

    const prompt = `
Anda adalah analis literasi media.

BATASAN OUTPUT:
- Ringkasan maksimal 5 kalimat.
- PRO 3 poin.
- KONTRA 3 poin.
- Perbandingan maksimal 5 kalimat.
- Max 1200 karakter.

TUGAS:
1. Ringkas Berita A.
2. Jika ada, bandingkan dengan Berita B.
3. Jika tidak ada, buat PRO & KONTRA.
4. Nilai indikator risiko (YA/TIDAK):
A. Sumber tidak jelas
B. Narasumber anonim
C. Judul sensasional
D. Konteks tidak jelas
E. Bahasa emosional

FORMAT OUTPUT:
Ringkasan:
...

Pro dan Kontra:
PRO:
- ...
KONTRA:
- ...

Perbandingan (jika ada):
...

Indikator Risiko:
A: YA/TIDAK - ...
B: YA/TIDAK - ...
C: YA/TIDAK - ...
D: YA/TIDAK - ...
E: YA/TIDAK - ...
`;

    const apiKey = process.env.OPENROUTER_API_KEY;

    async function call(model) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    }

    const models = [
      "google/gemma-3n-e2b-it:free",
      "google/gemma-2-27b-it:free",
      "meta-llama/llama-3.1-8b-instruct:free"
    ];

    let output = null;
    for (let m of models) {
      output = await call(m);
      if (output) break;
    }

    const ind = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    if (output.includes("A: YA")) ind.A = 20;
    if (output.includes("B: YA")) ind.B = 20;
    if (output.includes("C: YA")) ind.C = 20;
    if (output.includes("D: YA")) ind.D = 20;
    if (output.includes("E: YA")) ind.E = 20;

    const total = ind.A + ind.B + ind.C + ind.D + ind.E;

    let level = "Rendah";
    if (total >= 40) level = "Sedang";
    if (total >= 70) level = "Tinggi";

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        analysis_text: output,
        indicators: ind,
        risk_percentage: total,
        risk_level: level,
        disclaimer: "Persentase menunjukkan risiko misinformasi, bukan kebenaran berita."
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
