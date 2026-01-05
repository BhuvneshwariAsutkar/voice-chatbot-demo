// This script will load FAQ data from a CSV and crawl a website, then export as knowledgeData
import fs from 'fs';
import csv from 'csv-parser';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { knowledgeData } from './knowledgeData.js';
import { CSV_PATHS, FAQ_URL_PATHS } from './sourcePaths.js';

export async function loadCSVData(csvFilePath) {
  console.log(`Loading CSV data from: ${csvFilePath}`);
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => {
        const question = data.Title || data.title || '';
        const answer = data.Description || data.description || '';
        if (question && answer) {
          results.push({ question, answer });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

export async function crawlFAQPage(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const faqs = [];
    // 0. specific: .accordion-row with .accordion-label and .accordion-body
    $('.accordion-row').each((i, el) => {
      const question = $(el).find('.accordion-label.h3').text().trim();
      const answer = $(el).find('.accordion-body').text().trim();
      if (question && answer) {
        faqs.push({ question, answer });
      }
    });

    // Try to extract FAQ pairs (update selectors as needed for the site structure)
    $('.faq, .faq-item, .faq-question').each((i, el) => {
      const question = $(el).find('h2, h3, .question').first().text().trim();
      const answer = $(el).find('p, .answer').first().text().trim();
      if (question && answer) {
        faqs.push({ question, answer });
      }
    });
    // Fallback: try to extract all Q/A pairs in <dt>/<dd> or similar
    if (faqs.length === 0) {
      $('dt').each((i, el) => {
        const question = $(el).text().trim();
        const answer = $(el).next('dd').text().trim();
        if (question && answer) {
          faqs.push({ question, answer });
        }
      });
    }
    console.log(`Crawled ${faqs.length} FAQs from ${url}`);
    return faqs;
  } catch (err) {
    console.error('Error crawling FAQ page:', err);
    return [];
  }
}

export async function getCombinedKnowledgeData() {
  // Load all CSVs in parallel
  const allCsvArrays = await Promise.all(CSV_PATHS.map(filePath => loadCSVData(filePath)));
  // Flatten the results into a single array
  const csvData = allCsvArrays.flat();
  // Crawl all URLs in parallel
  const allFaqsArrays = await Promise.all(FAQ_URL_PATHS.map(url => crawlFAQPage(url)));
  // Flatten the results into a single array
  const webData = allFaqsArrays.flat();
  // Merge local knowledge.js data as well
  const localData = Array.isArray(knowledgeData) ? knowledgeData : [];
  return [...csvData, ...webData,...localData];
}