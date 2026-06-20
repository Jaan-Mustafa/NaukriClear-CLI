#!/usr/bin/env node
// detect-ats.mjs — Probe Greenhouse / Ashby / Lever APIs for each company
// and output portals.yml entries for confirmed hits.

const COMPANIES = [
  // Fintech
  { name: 'Pine Labs',        slugs: ['pinelabs', 'pine-labs'] },
  { name: 'PayU',             slugs: ['payu', 'payu-india', 'payuindia'] },
  { name: 'Zerodha',          slugs: ['zerodha'] },
  { name: 'BharatPe',         slugs: ['bharatpe', 'bharat-pe'] },
  { name: 'PolicyBazaar',     slugs: ['policybazaar', 'pb-fintech', 'pbfintech'] },
  { name: 'Upstox',           slugs: ['upstox'] },
  { name: 'Chargebee',        slugs: ['chargebee'] },
  { name: 'Zeta',             slugs: ['zeta', 'zeta-tech'] },
  { name: 'CoinDCX',          slugs: ['coindcx'] },
  { name: 'CoinSwitch',       slugs: ['coinswitch', 'coinswitch-kuber'] },
  { name: 'Acko',             slugs: ['acko', 'acko-insurance'] },
  { name: 'Digit Insurance',  slugs: ['digit', 'godigit', 'digit-insurance'] },
  { name: 'OneCard',          slugs: ['onecard', 'fpl-technologies', 'fpl'] },
  { name: 'Perfios',          slugs: ['perfios'] },
  { name: 'MoneyView',        slugs: ['moneyview', 'money-view'] },
  { name: 'Dhan',             slugs: ['dhan', 'moneylicious'] },
  { name: 'Juspay',           slugs: ['juspay'] },
  { name: 'KreditBee',        slugs: ['kreditbee'] },
  { name: 'Oxyzo',            slugs: ['oxyzo', 'ofbusiness'] },
  { name: 'Navi',             slugs: ['navi', 'navi-technologies'] },
  { name: 'Jupiter',          slugs: ['jupiter', 'jupiter-money', 'amica-financial-technologies'] },
  { name: 'IndMoney',         slugs: ['indmoney', 'ind-money'] },
  { name: 'Cashfree',         slugs: ['cashfree', 'cashfree-payments'] },
  { name: 'M2P Fintech',      slugs: ['m2p', 'm2p-fintech', 'api2pay'] },
  { name: 'Yubi',             slugs: ['yubi', 'credavenue', 'cred-avenue'] },
  { name: 'Fibe',             slugs: ['fibe', 'earlysalary', 'early-salary'] },

  // E-commerce & Quick Commerce
  { name: 'Nykaa',            slugs: ['nykaa', 'fsg-nykaa'] },
  { name: 'Lenskart',         slugs: ['lenskart'] },
  { name: 'Cars24',           slugs: ['cars24'] },
  { name: 'OfBusiness',       slugs: ['ofbusiness', 'of-business'] },
  { name: 'Moglix',           slugs: ['moglix'] },
  { name: 'FirstCry',         slugs: ['firstcry', 'brainbees'] },
  { name: 'CarDekho',         slugs: ['cardekho', 'girnarsoft'] },
  { name: 'Spinny',           slugs: ['spinny'] },
  { name: 'Purplle',          slugs: ['purplle'] },
  { name: 'Bluestone',        slugs: ['bluestone', 'bluestone-jewellery'] },

  // Foodtech & Consumer
  { name: 'Zomato',           slugs: ['zomato'] },
  { name: 'Swiggy',           slugs: ['swiggy', 'bundl-technologies'] },
  { name: 'Urban Company',    slugs: ['urbancompany', 'urban-company', 'urbanclap'] },
  { name: 'Rebel Foods',      slugs: ['rebelfoods', 'rebel-foods'] },
  { name: 'Licious',          slugs: ['licious'] },
  { name: 'CureFit',          slugs: ['curefit', 'cure-fit', 'cultfit'] },

  // Edtech
  { name: 'PhysicsWallah',    slugs: ['physicswallah', 'physics-wallah', 'pw'] },
  { name: 'Unacademy',        slugs: ['unacademy'] },
  { name: 'upGrad',           slugs: ['upgrad', 'up-grad'] },
  { name: 'Eruditus',         slugs: ['eruditus'] },
  { name: 'Vedantu',          slugs: ['vedantu'] },
  { name: 'Apna',             slugs: ['apna', 'apna-time'] },
  { name: 'Scaler',           slugs: ['scaler', 'scaler-academy', 'interviewbit'] },
  { name: 'Classplus',        slugs: ['classplus'] },

  // Healthtech
  { name: 'Innovaccer',       slugs: ['innovaccer'] },
  { name: 'PharmEasy',        slugs: ['pharmeasy', 'api-holdings'] },
  { name: 'Tata 1mg',         slugs: ['1mg', 'tata-1mg', 'tata1mg'] },
  { name: 'Pristyn Care',     slugs: ['pristyncare', 'pristyn-care'] },

  // SaaS / Enterprise
  { name: 'Darwinbox',        slugs: ['darwinbox'] },
  { name: 'Zenoti',           slugs: ['zenoti'] },
  { name: 'LeadSquared',      slugs: ['leadsquared', 'lead-squared'] },
  { name: 'Mindtickle',       slugs: ['mindtickle', 'mind-tickle'] },
  { name: 'Amagi',            slugs: ['amagi'] },
  { name: 'Uniphore',         slugs: ['uniphore'] },
  { name: 'Gupshup',         slugs: ['gupshup'] },
  { name: 'Hasura',           slugs: ['hasura'] },
  { name: 'Fractal Analytics',slugs: ['fractal', 'fractal-analytics'] },
  { name: 'Whatfix',          slugs: ['whatfix'] },
  { name: 'CleverTap',        slugs: ['clevertap', 'clever-tap'] },
  { name: 'Atlan',            slugs: ['atlan'] },
  { name: 'BookMyShow',       slugs: ['bookmyshow', 'big-tree-entertainment'] },
  { name: 'InsuranceDekho',   slugs: ['insurancedekho', 'insurance-dekho'] },

  // Logistics & Mobility
  { name: 'Delhivery',        slugs: ['delhivery'] },
  { name: 'Ola',              slugs: ['ola', 'ani-technologies'] },
  { name: 'Shiprocket',       slugs: ['shiprocket'] },
  { name: 'BlackBuck',        slugs: ['blackbuck', 'zinka-logistics'] },
  { name: 'Porter',           slugs: ['porter', 'porter-logistics'] },
  { name: 'Rapido',           slugs: ['rapido', 'roppen-transportation'] },
  { name: 'Shadowfax',        slugs: ['shadowfax'] },

  // EV & Deep Tech
  { name: 'Ola Electric',     slugs: ['olaelectric', 'ola-electric'] },
  { name: 'Ather Energy',     slugs: ['ather', 'ather-energy'] },
  { name: 'Krutrim',          slugs: ['krutrim', 'krutrim-ai'] },
  { name: 'Skyroot',          slugs: ['skyroot', 'skyroot-aerospace'] },
  { name: 'Fireflies',        slugs: ['fireflies', 'fireflies-ai'] },

  // Gaming & Media
  { name: 'Dream11',          slugs: ['dream11', 'dream-sports'] },
  { name: 'Games24x7',        slugs: ['games24x7'] },
  { name: 'MPL',              slugs: ['mpl', 'mobile-premier-league'] },
  { name: 'InMobi',           slugs: ['inmobi'] },
  { name: 'ShareChat',        slugs: ['sharechat', 'mohalla-tech'] },
  { name: 'DailyHunt',        slugs: ['dailyhunt', 'verse', 'verse-innovation'] },
  { name: 'Pocket FM',        slugs: ['pocketfm', 'pocket-fm'] },
  { name: 'Zupee',            slugs: ['zupee'] },

  // Proptech & Travel
  { name: 'OYO',              slugs: ['oyo', 'oravel-stays'] },
  { name: 'NoBroker',         slugs: ['nobroker', 'no-broker'] },
  { name: 'Livspace',         slugs: ['livspace'] },

  // Soonicorns
  { name: 'Pocket FM',        slugs: ['pocketfm', 'pocket-fm'] },
];

async function probeGreenhouse(slug) {
  try {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, {
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const { jobs = [] } = await r.json();
      return jobs.length > 0 ? slug : null;
    }
  } catch {}
  return null;
}

async function probeAshby(slug) {
  try {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const data = await r.json();
      return data?.jobPostings?.length > 0 ? slug : null;
    }
  } catch {}
  return null;
}

async function probeLever(slug) {
  try {
    const r = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const data = await r.json();
      return Array.isArray(data) && data.length > 0 ? slug : null;
    }
  } catch {}
  return null;
}

async function detectCompany(company) {
  for (const slug of company.slugs) {
    const [gh, ab, lv] = await Promise.all([
      probeGreenhouse(slug),
      probeAshby(slug),
      probeLever(slug),
    ]);
    if (gh) return { name: company.name, type: 'greenhouse', id: gh };
    if (ab) return { name: company.name, type: 'ashby', id: ab };
    if (lv) return { name: company.name, type: 'lever', id: lv };
  }
  return { name: company.name, type: null, id: null };
}

async function run() {
  const CONCURRENCY = 8;
  const results = [];
  const queue = [...COMPANIES];
  let done = 0;

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const company = queue.shift();
      const result = await detectCompany(company);
      done++;
      if (result.type) {
        process.stdout.write(`  ✓  [${result.type.padEnd(10)}] ${result.name} → ${result.id}\n`);
      } else {
        process.stdout.write(`  ✗  [custom ATS ] ${result.name}\n`);
      }
      results.push(result);
    }
  });

  console.log(`\nProbing ${COMPANIES.length} companies across Greenhouse / Ashby / Lever...\n`);
  await Promise.all(workers);

  const hits = results.filter(r => r.type);
  console.log(`\n─────────────────────────────────────────────`);
  console.log(`  Detected: ${hits.length} / ${COMPANIES.length}`);
  console.log(`─────────────────────────────────────────────\n`);

  console.log('# Paste this into config/portals.yml:\n');
  const byType = { greenhouse: [], ashby: [], lever: [] };
  for (const r of hits) byType[r.type].push(r);

  for (const [type, list] of Object.entries(byType)) {
    if (!list.length) continue;
    const key = type === 'greenhouse' ? 'greenhouse_id' : type === 'ashby' ? 'ashby_id' : 'lever_id';
    for (const r of list) {
      console.log(`  - name: ${r.name}`);
      console.log(`    ${key}: ${r.id}\n`);
    }
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
