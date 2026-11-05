/**
 * Dual Similarity Analysis Engine:
 * 1. Semantic Vector Generation (Deterministic 384-dimensional dense projection)
 * 2. Structural N-gram / Token Overlap Analysis (Jaccard similarity)
 * 3. Line Matching / Explainability Diff Generator
 */

// 1. Code Normalization (strips comments, extra whitespace, trims blank lines)
export function normalizeCode(code: string, language: 'python' | 'cpp'): string {
  let cleaned = code;
  if (language === 'python') {
    // Strip single line comments #
    cleaned = cleaned.replace(/#.*$/gm, '');
    // Strip docstrings
    cleaned = cleaned.replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, '');
  } else {
    // Strip C++ block comments /* */
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    // Strip C++ line comments //
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
  }

  // Normalize whitespace: trim lines, replace multiple spaces/tabs with single space, remove empty lines
  return cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// 2. Tokenize into normalized token stream
export function tokenizeCode(code: string): string[] {
  // Extract alphanumeric tokens and structural operators
  const tokens = code.match(/[a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|==|!=|<=|>=|\+\+|--|&&|\|\||[{}()\[\]+\-*/=<>:;,.]/g);
  return tokens || [];
}

// 3. Compute N-gram Jaccard Overlap (default 3-grams)
export function computeNgramSimilarity(codeA: string, codeB: string, n = 3): { score: number; matchedLines: number } {
  const tokensA = tokenizeCode(codeA);
  const tokensB = tokenizeCode(codeB);

  if (tokensA.length < n || tokensB.length < n) {
    // Fallback to token unigram Jaccard if snippet is very short
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    const score = union.size === 0 ? 0 : intersection.size / union.size;
    return { score: Number(score.toFixed(4)), matchedLines: 0 };
  }

  const ngramsA = new Set<string>();
  for (let i = 0; i <= tokensA.length - n; i++) {
    ngramsA.add(tokensA.slice(i, i + n).join(' '));
  }

  const ngramsB = new Set<string>();
  for (let i = 0; i <= tokensB.length - n; i++) {
    ngramsB.add(tokensB.slice(i, i + n).join(' '));
  }

  let intersectionCount = 0;
  for (const gram of ngramsA) {
    if (ngramsB.has(gram)) {
      intersectionCount++;
    }
  }

  const unionCount = ngramsA.size + ngramsB.size - intersectionCount;
  const score = unionCount === 0 ? 0 : intersectionCount / unionCount;

  // Approximate matched line count
  const linesA = new Set(codeA.split('\n'));
  const linesB = codeB.split('\n');
  let matchedLines = 0;
  for (const line of linesB) {
    if (line.length > 3 && linesA.has(line)) {
      matchedLines++;
    }
  }

  return { score: Number(score.toFixed(4)), matchedLines };
}

// 4. Generate dense 384-dimensional semantic embedding vector
// Implements semantic feature extraction + hash-kernel dense projection with L2 normalization
// Produces high cosine similarity for semantically close / structurally isomorphic code logic.
export function generateEmbeddingVector(normalizedCode: string, dim = 384): number[] {
  const tokens = tokenizeCode(normalizedCode);
  const vector = new Array(dim).fill(0);

  if (tokens.length === 0) {
    vector[0] = 1.0;
    return vector;
  }

  // Extract structural features: unigrams, bigrams, control flow signatures
  const features: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    features.push(`tok:${tokens[i]}`);
    if (i + 1 < tokens.length) {
      features.push(`bi:${tokens[i]}_${tokens[i + 1]}`);
    }
    if (i + 2 < tokens.length) {
      features.push(`tri:${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`);
    }
  }

  // Keyword semantic weighting: loop constructs, conditionals, memory/data structures
  const keywords = new Set([
    'for', 'while', 'if', 'else', 'def', 'return', 'class', 'import',
    'vector', 'map', 'unordered_map', 'set', 'int', 'float', 'string',
    'push_back', 'insert', 'append', 'len', 'range', 'dict', 'list'
  ]);

  for (const f of features) {
    let weight = 1.0;
    for (const kw of keywords) {
      if (f.includes(kw)) {
        weight = 2.5;
        break;
      }
    }

    // Hash feature into dimension buckets
    let h1 = 0x811c9dc5;
    for (let c = 0; c < f.length; c++) {
      h1 ^= f.charCodeAt(c);
      h1 = Math.imul(h1, 0x01000193);
    }
    const idx = Math.abs(h1) % dim;
    const sign = (h1 & 1) === 0 ? 1 : -1;
    vector[idx] += sign * weight;
  }

  // L2 Unit Normalization (required for exact cosine distance in pgvector)
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return vector;
}

// Convert number array to pgvector string format: '[0.123, -0.456, ...]'
export function vectorToSql(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
