export const handler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body kosong" }),
      };
    }

    const { newsA, newsB } = JSON.parse(event.body);

    if (!newsA || newsA.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Berita A wajib diisi" }),
      };
    }

    const prompt = `
Anda adalah analis literasi media.

TUGAS:
1. Ringkas Berita A secara netral.
2. Jika Berita B ada, bandingkan sudut pandang (pro-kontra, fokus, framing).
3. Jika Berita B tidak ada, buatkan PRO & KONTRA dari Berita A saja.
4. Nilai 5 indikator risiko misinformasi (YA/TIDAK + alasan singkat):
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

Berita A:
${newsA}

Berita B:
${newsB || "(Tidak ada)"} 
`;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key tidak terbaca di Netlify" }),
      };
    }

    // ==========================
    // Fungsi request AI dgn retry
    // ==========================
    async function callAI(modelName) {
      let attempts = 0;

      while (attempts < 3) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: modelName,
              messages: [{ role: "user", content: prompt }]
            })
          });

          const data = await res.json();

          if (data?.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
          }

          attempts++;
          await new Promise(r => setTimeout(r, 800));
        } catch {
          attempts++;
          await new Promise(r => setTimeout(r, 800));
        }
      }

      return null;
    }

    // Model utama + fallback
    const MODELS = [
      "google/gemma-3n-e2b-it:free",
      "google/gemma-2-27b-it:free",
      "meta-llama/llama-3.1-8b-instruct:free"
    ];

    let output = null;

    for (const model of MODELS) {
      output = await callAI(model);
      if (output) break;
    }

    if (!output) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "AI gagal merespon setelah 3 percobaan" }),
      };
    }

    // =============================
    // Hitung indikator risiko
    // =============================
    const indicators = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    if (output.includes("A: YA")) indicators.A = 20;
    if (output.includes("B: YA")) indicators.B = 20;
    if (output.includes("C: YA")) indicators.C = 20;
    if (output.includes("D: YA")) indicators.D = 20;
    if (output.includes("E: YA")) indicators.E = 20;

    const risk_percentage =
      indicators.A + indicators.B + indicators.C + indicators.D + indicators.E;

    let risk_level = "Rendah";
    if (risk_percentage >= 40) risk_level = "Sedang";
    if (risk_percentage >= 70) risk_level = "Tinggi";

    return {
      statusCode: 200,
      body: JSON.stringify({
        analysis_text: output,
        indicators,
        risk_percentage,
        risk_level,
        disclaimer:
          "Persentase menunjukkan potensi risiko misinformasi berdasarkan indikator literasi media, bukan penentu kebenaran."
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Kesalahan server", detail: err.message }),
    };
  }
};
