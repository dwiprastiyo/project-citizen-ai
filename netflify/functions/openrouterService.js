import fetch from "node-fetch";

export async function analyzeWithAI(newsA, newsB) {
  const prompt = `
Anda adalah asisten literasi media.

Tugas Anda:
1. Ringkas BERITA A secara netral.
2. Bandingkan sudut pandang BERITA A dan BERITA B (jika ada).
3. Identifikasi indikator risiko misinformasi berikut
   dengan jawaban YA atau TIDAK disertai alasan singkat.

Indikator:
A. Sumber berita tidak dijelaskan dengan jelas
B. Narasumber anonim atau tidak jelas
C. Judul bersifat sensasional atau provokatif
D. Konteks waktu atau peristiwa kurang jelas
E. Bahasa emosional atau menggiring opini

Larangan:
- Jangan menyatakan berita benar atau salah
- Jangan menyebut hoaks atau fakta palsu
- Jangan memberi persentase

Gunakan FORMAT TEPAT berikut:

Ringkasan:
...

Perbandingan:
...

Indikator:
A: YA/TIDAK - alasan singkat
B: YA/TIDAK - alasan singkat
C: YA/TIDAK - alasan singkat
D: YA/TIDAK - alasan singkat
E: YA/TIDAK - alasan singkat

Berita A:
${newsA}

Berita B:
${newsB || "-"}
`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it",
        messages: [{ role: "user", content: prompt }]
      })
    }
  );

  const data = await response.json();
  return data.choices[0].message.content;
}
