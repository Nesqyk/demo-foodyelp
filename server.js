const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

loadEnv();

const PORT = process.env.PORT || 3000;
const MAX_YELP_RESULTS = 240;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

if (require.main === module) {
  startServer();
}

async function handleRestaurantSearch(requestUrl, res) {
  const city = (requestUrl.searchParams.get('city') || '').trim();
  const yelpApiKey = process.env.YELP_API_KEY;
  const page = parsePositiveInteger(requestUrl.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePositiveInteger(requestUrl.searchParams.get('limit'), 10), 10);
  const offset = (page - 1) * pageSize;

  if (!city) {
    sendJson(res, 400, { error: 'City is required' });
    return;
  }

  if (!yelpApiKey) {
    sendJson(res, 500, { error: 'Missing YELP_API_KEY in environment' });
    return;
  }

  const yelpUrl = new URL('https://api.yelp.com/v3/businesses/search');
  yelpUrl.searchParams.set('location', city);
  yelpUrl.searchParams.set('categories', 'restaurants');
  yelpUrl.searchParams.set('radius', '8047');
  yelpUrl.searchParams.set('limit', String(pageSize));
  yelpUrl.searchParams.set('offset', String(offset));
  yelpUrl.searchParams.set('sort_by', 'best_match');

  const response = await fetch(yelpUrl, {
    headers: {
      Authorization: `Bearer ${yelpApiKey}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Yelp API error:', response.status, errorText);
    sendJson(res, response.status, {
      error: 'Unable to fetch Yelp results right now'
    });
    return;
  }

  const payload = await response.json();
  const totalResults = Math.min(payload.total || 0, MAX_YELP_RESULTS);
  const restaurants = (payload.businesses || [])
    .filter((business) => business.name && business.location && business.coordinates)
    .map((business) => ({
      name: business.name,
      rating: business.rating,
      address: formatAddress(business.location.display_address),
      imageUrl: business.image_url || '',
      reviewCount: business.review_count || 0,
      price: business.price || '',
      categories: Array.isArray(business.categories)
        ? business.categories.map((category) => category.title).filter(Boolean).slice(0, 3)
        : [],
      coordinates: {
        latitude: business.coordinates.latitude,
        longitude: business.coordinates.longitude
      }
    }));

  sendJson(res, 200, {
    city,
    page,
    pageSize,
    total: totalResults || restaurants.length,
    totalPages: Math.max(1, Math.ceil((totalResults || restaurants.length) / pageSize)),
    restaurants
  });
}

function serveStaticFile(requestPath, res) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = path.normalize(normalizedPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }

      sendJson(res, 500, { error: 'Unable to read file' });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function formatAddress(displayAddress) {
  return Array.isArray(displayAddress) ? displayAddress.join(', ') : '';
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function loadEnv() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function createAppServer() {
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);

      if (requestUrl.pathname === '/api/restaurants' && req.method === 'GET') {
        await handleRestaurantSearch(requestUrl, res);
        return;
      }

      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      serveStaticFile(requestUrl.pathname, res);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: 'Unexpected server error' });
    }
  });
}

function startServer(port = PORT) {
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
  return server;
}

module.exports = {
  createAppServer,
  startServer
};
