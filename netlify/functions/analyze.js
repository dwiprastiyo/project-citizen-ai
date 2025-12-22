import fetch from "node-fetch";

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

    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API KEY tidak terbaca di Netlify" }),
      };
    }

    // ==========================
    // FUNGSI REQUEST DENGAN RETRY
    // ==========================
    async function callAI(modelName) {
      let attempts = 0;

      while (attempts < 3) {
        try {
          const aiResponse = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openrouterKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: modelName,
                messages: [{ role: "user", content: prompt }],
              }),
            }
          );

          const data = await aiResponse.json();

          // Cek jika sukses
          if (data.choices && data.choices[0]) {
            return data.choices[0].message.content;
          }

          // Jika ada error dari server
          attempts++;
          await new Promise((res) => setTimeout(res, 700));

        } catch (err) {
          attempts++;
          await new Promise((res) => setTimeout(res, 700));
        }
      }

      return null;
    }

    // ==========================
    // MODEL UTAMA + MODEL CADANGAN
    // ==========================
    const MODELS = [
      "google/gemma-3n-e2b-it:free",        // model pilihan kamu
      "google/gemma-2-27b-it:free",         // fallback 1 (stabil)
      "meta-llama/llama-3.1-8b-instruct:free" // fallback 2 (paling aman)
    ];

    let aiText = null;

    for (let model of MODELS) {
      aiText = await callAI(model);
      if (aiText) break;
    }

    if (!aiText) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "AI gagal merespon setelah 3 percobaan." }),
      };
    }

    // =============================
    // HITUNG INDIKATOR & PERSENTASE
    // =============================
    const indicators = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    if (aiText.includes("A: YA")) indicators.A = 20;
    if (aiText.includes("B: YA")) indicators.B = 20;
    if (aiText.includes("C: YA")) indicators.C = 20;
    if (aiText.includes("D: YA")) indicators.D = 20;
    if (aiText.includes("E: YA")) indicators.E = 20;

    const riskPercentage =
      indicators.A +
      indicators.B +
      indicators.C +
      indicators.D +
      indicators.E;

    let level = "Rendah";
    if (riskPercentage >= 40) level = "Sedang";
    if (riskPercentage >= 70) level = "Tinggi";

    return {
      statusCode: 200,
      body: JSON.stringify({
        analysis_text: aiText,
        indicators,
        risk_percentage: riskPercentage,
        risk_level: level,
        disclaimer:
          "Persentase ini menunjukkan potensi risiko misinformasi berdasarkan indikator literasi media, bukan penentu benar/salahnya berita."
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Terjadi kesalahan internal server",
        detail: err.message,
      }),
    };
  }
};
