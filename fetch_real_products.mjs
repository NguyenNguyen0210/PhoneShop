import fs from 'fs';

const TAVILY_API_KEY = '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';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tavilySearch(query) {
  console.log(`[Tavily] Searching: "${query}"...`);
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: 3
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Tavily] Error ${res.status}:`, errText);
    return null;
  }
  return await res.json();
}

async function main() {
  const products = [
    {
      id: 'iphone-16-pro-max',
      name: 'iPhone 16 Pro Max',
      query: 'iPhone 16 Pro Max giá chính hãng CellphoneS Dienmayxanh thông số màn hình pin chip'
    },
    {
      id: 'iphone-16-plus',
      name: 'iPhone 16 Plus',
      query: 'iPhone 16 Plus giá chính hãng CellphoneS Thegioididong thông số kỹ thuật'
    },
    {
      id: 'iphone-15-pro-max',
      name: 'iPhone 15 Pro Max',
      query: 'iPhone 15 Pro Max giá chính hãng CellphoneS Thegioididong thông số kỹ thuật'
    },
    {
      id: 'galaxy-s24-ultra',
      name: 'Samsung Galaxy S24 Ultra',
      query: 'Samsung Galaxy S24 Ultra giá chính hãng CellphoneS Thegioididong thông số kỹ thuật'
    },
    {
      id: 'galaxy-z-fold6',
      name: 'Samsung Galaxy Z Fold6',
      query: 'Samsung Galaxy Z Fold6 giá chính hãng CellphoneS Thegioididong thông số kỹ thuật'
    },
    {
      id: 'galaxy-z-flip6',
      name: 'Samsung Galaxy Z Flip6',
      query: 'Samsung Galaxy Z Flip6 giá chính hãng CellphoneS Thegioididong thông số kỹ thuật'
    },
    {
      id: 'xiaomi-14-ultra',
      name: 'Xiaomi 14 Ultra',
      query: 'Xiaomi 14 Ultra giá chính hãng CellphoneS Thegioididong thông số kỹ thuật'
    },
    {
      id: 'pixel-9-pro',
      name: 'Google Pixel 9 Pro',
      query: 'Google Pixel 9 Pro giá bán thông số kỹ thuật Việt Nam'
    }
  ];

  const gathered = [];

  for (const p of products) {
    const data = await tavilySearch(p.query);
    gathered.push({
      product: p,
      tavily: data
    });
    // Wait 1.8 seconds between calls to stay comfortably within rate limits
    await sleep(1800);
  }

  fs.writeFileSync('tavily_scraped_products.json', JSON.stringify(gathered, null, 2), 'utf-8');
  console.log('Finished fetching! Saved to tavily_scraped_products.json');
}

main().catch(console.error);
