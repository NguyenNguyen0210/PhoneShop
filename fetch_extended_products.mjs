import fs from 'fs';

const TAVILY_API_KEY = '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';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tavilySearch(query) {
  console.log(`[Tavily] Searching: "${query}"...`);
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
  const extraProducts = [
    { id: 'iphone-16-pro', name: 'iPhone 16 Pro', query: 'iPhone 16 Pro giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'iphone-16', name: 'iPhone 16', query: 'iPhone 16 giá chính hãng CellphoneS Thegioididong thông số kỹ thuật' },
    { id: 'iphone-13', name: 'iPhone 13', query: 'iPhone 13 128GB giá chính hãng CellphoneS Thegioididong' },
    { id: 'galaxy-s24-plus', name: 'Samsung Galaxy S24 Plus', query: 'Samsung Galaxy S24 Plus giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'galaxy-a55', name: 'Samsung Galaxy A55 5G', query: 'Samsung Galaxy A55 5G giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'galaxy-a35', name: 'Samsung Galaxy A35 5G', query: 'Samsung Galaxy A35 5G giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'redmi-note-13-pro', name: 'Xiaomi Redmi Note 13 Pro 5G', query: 'Xiaomi Redmi Note 13 Pro 5G giá chính hãng CellphoneS Thegioididong' },
    { id: 'xiaomi-14', name: 'Xiaomi 14', query: 'Xiaomi 14 5G giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'ipad-pro-m4', name: 'iPad Pro M4 11 inch', query: 'iPad Pro M4 11 inch giá chính hãng CellphoneS Thegioididong thông số' },
    { id: 'ipad-air-m2', name: 'iPad Air M2 11 inch', query: 'iPad Air M2 11 inch giá chính hãng CellphoneS Thegioididong' },
    { id: 'galaxy-tab-s9-fe', name: 'Samsung Galaxy Tab S9 FE', query: 'Samsung Galaxy Tab S9 FE giá chính hãng CellphoneS Thegioididong' },
    { id: 'airpods-pro-2-usbc', name: 'AirPods Pro 2 Type-C', query: 'AirPods Pro 2 Type-C chính hãng giá CellphoneS Thegioididong' },
    { id: 'apple-watch-s10', name: 'Apple Watch Series 10', query: 'Apple Watch Series 10 giá chính hãng CellphoneS Thegioididong' }
  ];

  let existing = [];
  if (fs.existsSync('tavily_scraped_products.json')) {
    existing = JSON.parse(fs.readFileSync('tavily_scraped_products.json', 'utf-8'));
  }

  for (const p of extraProducts) {
    // Check if already fetched
    if (existing.some(e => e.product?.id === p.id)) {
      console.log(`Skipping ${p.id}, already fetched.`);
      continue;
    }
    const data = await tavilySearch(p.query);
    existing.push({
      product: p,
      tavily: data
    });
    await sleep(1600);
  }

  fs.writeFileSync('tavily_scraped_products.json', JSON.stringify(existing, null, 2), 'utf-8');
  console.log(`Total fetched products now: ${existing.length}`);
}

main().catch(console.error);
