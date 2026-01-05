// /lib/mcp/mcpManager.js
import {
  getCombinedKnowledgeData,
  crawlFAQPage,
  loadCSVData
} from '../data/dynamicKnowledgeLoader.js'
import { getRagSystem } from '../rag/ragSystemServer.js'
import { knowledgeData } from '../data/knowledgeData.js'
import { CSV_PATHS, FAQ_URL_PATHS } from '../data/sourcePaths.js'
import Fuse from 'fuse.js'

// --- Simple in-memory cache ---
const cache = {
  csvData: null,
  csvTimestamp: 0,
  websiteData: null,
  websiteTimestamp: 0
}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Central MCP controller
export async function handleMCP (query) {
  const lower = query.toLowerCase()
  // Use local knowledgeData and CSV for fast FAQ match check
  const localData = Array.isArray(knowledgeData) ? knowledgeData : []
  let csvData = []
  // --- CSV cache logic ---
  const now = Date.now()
  if (cache.csvData && now - cache.csvTimestamp < CACHE_TTL) {
    csvData = cache.csvData
  } else {
    try {
      const allCsvArrays = await Promise.all(
        CSV_PATHS.map(path => loadCSVData(path))
      )
      csvData = allCsvArrays.flat()
      cache.csvData = csvData
      cache.csvTimestamp = now
    } catch (e) {
      console.error('Error loading CSV data for fast FAQ match', e)
      return {
        error:
          'Sorry, FAQ data is temporarily unavailable. Please try again later.'
      }
    }
  }

  const fastData = [...csvData, ...localData]

  // --- Fuse.js fuzzy matching step ---
  const fuse = new Fuse(fastData, {
    keys: ['question'],
    threshold: 0.4,
    includeScore: true
  });

  const fuseResults = fuse.search(query);

  if (fuseResults.length > 0 && fuseResults[0].score <= 0.4) {
    const best = fuseResults[0].item;
    const score = fuseResults[0].score
    return {
      source: 'FAQ',
      answer: best.answer,
      confidence: 1 - score
    }
  }

  const { bestMatch, related } = faqMatchWithRelated(query, fastData);
  console.log('FAQ fast match result:', bestMatch)
  console.log('Related answers found:', related)
  if (bestMatch) {
    // If related answers exist, return them as well
    const mainAnswer = await faqAdapter(query)
    if (related.length > 0) {
      mainAnswer.related = related.map(r => ({
        question: r.question,
        answer: r.answer
      }))
    }
    console.log('Returning FAQ answer with related answers', mainAnswer)
    return mainAnswer
  } else if (lower.includes('bupa') || lower.includes('website')) {
    return await websiteAdapter()
  } else {
    // default → RAG
    return await ragAdapter(query)
  }
}

// --- Adapters ---
// FAQ string similarity matcher (token overlap) with related answers fallback
function faqMatchWithRelated (query, allData) {
  // Use typo-tolerant matching for bestMatch
  let best = null
  let bestScore = Infinity
  for (const item of allData) {
    const dist = levenshtein(query.toLowerCase(), item.question.toLowerCase())
    if (dist < bestScore) {
      bestScore = dist
      best = item
    }
  }
  // Related answers logic (token overlap, as before)
  const queryTokens = new Set(query.toLowerCase().split(/\W+/))
  const related = []
  for (let i = 0; i < allData.length; i++) {
    const qTokens = new Set(allData[i].question.toLowerCase().split(/\W+/))
    const intersection = new Set([...queryTokens].filter(x => qTokens.has(x)))
    const union = new Set([...queryTokens, ...qTokens])
    const score = intersection.size / union.size
    // Collect related answers above a lower threshold
    if (score > 0.2 && (!best || allData[i].question !== best.question)) {
      related.push(allData[i])
    }
  }
  // Only return best if typo distance is reasonable (<=3)
  return {
    bestMatch: bestScore <= 3 ? best : null,
    related
  }
}

// 1️⃣ FAQ adapter (CSV + website + local) with string similarity
async function faqAdapter (query) {
  const allData = await getCombinedKnowledgeData()
  const { bestMatch } = faqMatchWithRelated(query, allData)
  return {
    source: 'FAQ',
    answer: bestMatch ? bestMatch.answer : 'No FAQ match found.'
  }
}

// 2️⃣ Website adapter (crawl live site) with caching and error handling
async function websiteAdapter () {
  const now = Date.now()
  if (cache.websiteData && now - cache.websiteTimestamp < CACHE_TTL) {
    return cache.websiteData
  }
  try {
    const allFaqsArrays = await Promise.all(
      FAQ_URL_PATHS.map(url => crawlFAQPage(url))
    )
    const allFaqs = allFaqsArrays.flat()
    const result = {
      source: 'Website',
      data: allFaqs.slice(0, 8),
      message: `Fetched ${allFaqs.length} website FAQs from ${FAQ_URL_PATHS.length} pages`
    }
    cache.websiteData = result
    cache.websiteTimestamp = now
    console.log('Crawled website FAQs:', result)
    return result
  } catch (e) {
    console.error('Error crawling website FAQs', e)
    return {
      error:
        'Sorry, website FAQ data is temporarily unavailable. Please try again later.'
    }
  }
}

// 3️⃣ RAG adapter (semantic retrieval)
async function ragAdapter (query) {
  const rag = await getRagSystem()
  const docs = await rag.retrieve(query, 8)
  console.log('RAG retrieved documents:', docs)
  return {
    source: 'RAG',
    context: docs?.join('\n---\n'),
    ragScores: docs?.map(doc => doc.score)
  }
}

// Simple Levenshtein distance for typo tolerance
function levenshtein (a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  )
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] =
        a[i - 1] === b[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            )
    }
  }
  return matrix[a.length][b.length]
}
