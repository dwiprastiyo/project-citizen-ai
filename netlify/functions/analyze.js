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

Tugas:
1. Berikan ringkasan netral untuk Berita A.
2. Jika Berita B tersedia, bandingkan sudut pandang antara Berita A dan Berita B.
3. Jika Berita B tidak ada, buatkan analisis PRO dan KONTRA dari Berita A saja.
4. Nilai lima indikator risiko misinformasi berikut:
   A. Sumber tidak jelas
   B. Narasumber anonim
   C. Judul sensasional
   D. Konteks tidak jelas
   E. Bahasa emosional
   Jawab YA/TIDAK + alasan singkat.

Format output:
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
${newsB || "(Tidak ada)"}`;

    const openrouterKey = process.env.OPENROUTER_API_KEY;

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it:free",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const aiData = await aiResponse.json();

    if (!aiData.choices || !aiData.choices[0]) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "AI gagal merespon" })
      };
    }

    const text = aiData.choices[0].message.content;

    // =============================
    // HITUNG INDIKATOR & PERSENTASE
    // =============================
    const indicators = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    if (text.includes("A: YA")) indicators.A = 20;
    if (text.includes("B: YA")) indicators.B = 20;
    if (text.includes("C: YA")) indicators.C = 20;
    if (text.includes("D: YA")) indicators.D = 20;
    if (text.includes("E: YA")) indicators.E = 20;

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
        analysis_text: text,
        indicators,
        risk_percentage: riskPercentage,
        risk_level: level,
        disclaimer:
          "Persentase ini menunjukkan potensi risiko misinformasi berdasarkan indikator literasi media, bukan penentu benar/salahnya isi berita."
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Analisis gagal", detail: err.message })
    };
  }
};
