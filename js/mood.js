// Tebak emosi Gaby dari kata-kata yang dia ucapkan (langsung di perangkat, tanpa jeda).

const RULES = [
  ['kaget', /\b(astaga|ya ampun|hah\?|serius\?|beneran\?|what\?!|whoa|omg|oh my god|no way|wow!)/i],
  ['sedih', /\b(sedih|turut berduka|kasihan|ikut sedih|maaf banget|i'?m so sorry|that'?s sad|sad to hear|poor you)/i],
  ['ngambek', /\b(ngambek|hmph|huh!|sebel|kesel|jahat ih|curang|i'?m not talking to you|so mean|rude!)/i],
  ['gemas', /\b(gemes|gemas|aww+|so sweet|manis banget|terharu|sayang banget|lucu banget|cute|adorable|touched)/i],
  ['mikir', /\b(hmm+|sebentar ya|coba aku (cek|cari|lihat)|aku cari|let me (check|think|see|look)|good question|pertanyaan bagus)/i],
  ['senang', /\b(haha|hehe|wkwk|yay|asik|asyik|seru|hore|mantap|keren|senang|happy|awesome|great|nice|love it|excited)/i],
];

export function detectMood(text) {
  for (const [mood, re] of RULES) {
    if (re.test(text)) return mood;
  }
  return null;
}
