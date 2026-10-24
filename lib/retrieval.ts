export type ArticleForRetrieval = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
};

export type RetrievedSource = {
  articleId: string;
  slug: string;
  title: string;
  excerpt: string;
  score: number;
};

const stopWords = new Set([
  "about", "after", "again", "also", "an", "and", "are", "as", "at", "be", "because", "been", "before", "being", "between", "but", "by", "can", "could", "did", "do", "does", "for", "from", "has", "have", "he", "her", "here", "him", "his", "how", "if", "in", "is", "it", "its", "just", "may", "me", "more", "most", "my", "no", "not", "of", "on", "or", "our", "out", "please", "request", "she", "should", "so", "some", "such", "support", "team", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those", "through", "to", "under", "until", "us", "very", "was", "we", "were", "what", "when", "where", "which", "while", "will", "with", "would", "you", "your",
]);

function tokenize(value: string) {
  return (value.toLowerCase().normalize("NFKD").match(/[a-z0-9]{2,}/g) ?? []).filter((token) => !stopWords.has(token));
}

function splitIntoChunks(value: string, maxWords = 110, overlapWords = 18) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [words.join(" ")];
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += maxWords - overlapWords) {
    const part = words.slice(start, start + maxWords).join(" ");
    if (part) chunks.push(part);
  }
  return chunks;
}

export function retrieveSources(query: string, articles: ArticleForRetrieval[], limit = 3): RetrievedSource[] {
  const queryTerms = [...new Set(tokenize(query))];
  if (!queryTerms.length || !articles.length) return [];

  const chunks = articles.flatMap((article) => splitIntoChunks(article.content).map((text) => ({ article, text, tokens: tokenize(text) })));
  const documentFrequency = new Map<string, number>();
  for (const chunk of chunks) {
    for (const term of new Set(chunk.tokens)) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  }
  const averageLength = chunks.reduce((total, chunk) => total + chunk.tokens.length, 0) / Math.max(chunks.length, 1);
  const k1 = 1.2;
  const b = 0.75;

  const ranked = chunks.map((chunk) => {
    const counts = new Map<string, number>();
    for (const token of chunk.tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    let score = 0;
    for (const term of queryTerms) {
      const frequency = counts.get(term) ?? 0;
      if (frequency) {
        const frequencyInCorpus = documentFrequency.get(term) ?? 0;
        const inverseFrequency = Math.log(1 + (chunks.length - frequencyInCorpus + 0.5) / (frequencyInCorpus + 0.5));
        score += inverseFrequency * (frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * chunk.tokens.length / Math.max(averageLength, 1)));
      }
    }
    const titleTerms = new Set(tokenize(chunk.article.title));
    const summaryTerms = new Set(tokenize(chunk.article.summary ?? ""));
    const titleMatches = queryTerms.filter((term) => titleTerms.has(term)).length;
    const summaryMatches = queryTerms.filter((term) => summaryTerms.has(term)).length;
    const contentMatches = queryTerms.filter((term) => counts.has(term)).length;
    score += titleMatches * 2.5;
    score += summaryMatches * 1.2;
    const relevant = titleMatches >= 2 || contentMatches >= 3 || (titleMatches >= 1 && contentMatches >= 2);
    return { ...chunk, score, relevant };
  }).filter((chunk) => chunk.score > 0 && chunk.relevant).sort((left, right) => right.score - left.score);

  const seenArticles = new Set<string>();
  return ranked.filter((chunk) => {
    if (seenArticles.has(chunk.article.id)) return false;
    seenArticles.add(chunk.article.id);
    return true;
  }).slice(0, limit).map((chunk) => ({
    articleId: chunk.article.id,
    slug: chunk.article.slug,
    title: chunk.article.title,
    excerpt: chunk.text.length > 520 ? `${chunk.text.slice(0, 517).trimEnd()}...` : chunk.text,
    score: Number(chunk.score.toFixed(3)),
  }));
}
