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
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Request body kosong" }) };
    }

    const { newsA, newsB } = JSON.parse(event.body);

    if (!newsA || !newsA.trim()) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Berita A wajib diisi" }) };
    }

    const isCompare = newsB && newsB.trim() !== "";

    const prompt = `
Anda adalah analis literasi media.

Jika hanya Berita A:
- Ringkas berita A (maksimal 5 kalimat)
- Buat PRO (3 poin) dan KONTRA (3 poin)
- Nilai indikator A–E

Jika ada Berita B:
- Ringkas A & B
- Buat perbandingan sudut pandang
- PRO & KONTRA lebih ringkas
- Nilai indikator A–E tetap memakai Berita A

Indikator Risiko:
A. Sumber tidak jelas
B. Narasumber anonim
C. Judul sensasional
D. Konteks tidak jelas
E. Bahasa emosional

FORMAT WAJIB:
Ringkasan:
...

${isCompare ? "Perbandingan:\n...\n" : ""}

Pro dan Kontra:
PRO:
- ...
KONTRA:
- ...

Indikator Risiko:
A: YA/TIDAK - ...
B: YA/TIDAK - ...
C: YA/TIDAK - ...
D: YA/TIDAK - ...
E: YA/TIDAK - ...

Berita A:
${newsA}

Berita B:
${newsB || "(Tidak ada)"} 
`;

    const key = process.env.OPENROUTER_API_KEY;

    async function call(model) {
      try {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }]
          })
        });

        const d = await r.json();
        return d?.choices?.[0]?.message?.content || null;

      } catch {
        return null;
      }
    }

    const MODELS = [
      "google/gemma-3n-e2b-it:free",
      "google/gemma-2-27b-it:free",
      "meta-llama/llama-3.1-8b-instruct:free"
    ];

    let output = null;
    for (let m of MODELS) {
      output = await call(m);
      if (output) break;
    }

    if (!output) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "AI tidak merespons" }) };
    }

    // =============================
    // hitung indikator
    // =============================
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
        is_compare: isCompare
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
