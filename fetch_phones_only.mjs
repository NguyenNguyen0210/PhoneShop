import fs from 'fs';

const TAVILY_API_KEY = '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';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tavilySearch(query) {
  console.log(`[Tavily] Searching phone: "${query}"...`);
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 2
      })
    });
    if (!res.ok) {
      console.error(`[Tavily] Error ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[Tavily] Fetch error:`, err.message);
    return null;
  }
}

async function main() {
  const extraPhones = [
    { id: 'iphone-15', name: 'iPhone 15', query: 'iPhone 15 128GB giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'galaxy-s24', name: 'Samsung Galaxy S24', query: 'Samsung Galaxy S24 giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'galaxy-s24-fe', name: 'Samsung Galaxy S24 FE', query: 'Samsung Galaxy S24 FE giá chính hãng CellphoneS Thegioididong' },
    { id: 'xiaomi-14t-pro', name: 'Xiaomi 14T Pro 5G', query: 'Xiaomi 14T Pro giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'redmi-note-13', name: 'Xiaomi Redmi Note 13', query: 'Xiaomi Redmi Note 13 6GB giá chính hãng CellphoneS Thegioididong' },
    { id: 'pixel-9', name: 'Google Pixel 9', query: 'Google Pixel 9 giá bán thông số kỹ thuật Việt Nam' },
    { id: 'oppo-find-n3-flip', name: 'OPPO Find N3 Flip', query: 'OPPO Find N3 Flip giá chính hãng CellphoneS Thegioididong' },
    { id: 'oppo-reno12-pro', name: 'OPPO Reno12 Pro 5G', query: 'OPPO Reno12 Pro 5G giá chính hãng CellphoneS Thegioididong thông số' }
  ];

  let existing = [];
  if (fs.existsSync('tavily_scraped_products.json')) {
    existing = JSON.parse(fs.readFileSync('tavily_scraped_products.json', 'utf-8'));
  }

  for (const p of extraPhones) {
    if (existing.some(e => e.product?.id === p.id)) continue;
    const data = await tavilySearch(p.query);
    existing.push({
      product: p,
      tavily: data
    });
    await sleep(1600);
  }

  fs.writeFileSync('tavily_scraped_products.json', JSON.stringify(existing, null, 2), 'utf-8');
  console.log(`Finished! Total scraped products: ${existing.length}`);
}

main().catch(console.error);
