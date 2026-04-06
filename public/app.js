const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const statusText = document.getElementById('status');
const resultsContainer = document.getElementById('results');
const paginationMeta = document.getElementById('pagination-meta');
const paginationContainer = document.getElementById('pagination');
const template = document.getElementById('restaurant-template');
const submitButton = form.querySelector('button');
const PAGE_SIZE = 8;
const searchState = {
  city: '',
  page: 1,
  totalPages: 1,
  total: 0
};

renderState('Start with a city', 'Enter a city to load results.');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (!city) {
    statusText.textContent = 'Please enter a city.';
    renderState('Start with a city', 'Enter a city to load results.');
    clearPagination();
    return;
  }

  searchState.city = city;
  searchState.page = 1;

  await loadRestaurants();
});

paginationContainer.addEventListener('click', async (event) => {
  const target = event.target.closest('button[data-page]');

  if (!target || target.disabled) {
    return;
  }

  const nextPage = Number.parseInt(target.dataset.page, 10);
  if (!Number.isInteger(nextPage) || nextPage === searchState.page) {
    return;
  }

  searchState.page = nextPage;
  await loadRestaurants();
});

async function loadRestaurants() {
  setLoadingState(true, `Loading Yelp restaurants for ${searchState.city}...`);
  resultsContainer.innerHTML = '';
  clearPagination();

  try {
    const response = await fetch(
      `/api/restaurants?city=${encodeURIComponent(searchState.city)}&page=${searchState.page}&limit=${PAGE_SIZE}`
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to fetch restaurants.');
    }

    searchState.total = payload.total || 0;
    searchState.totalPages = payload.totalPages || 1;
    searchState.page = payload.page || 1;

    renderRestaurants(payload.restaurants || []);
    statusText.textContent = buildStatusMessage(payload);
    renderPagination();
  } catch (error) {
    renderState('Unable to load results', 'Something went wrong while loading Yelp results.');
    statusText.textContent = error.message;
    clearPagination();
  } finally {
    setLoadingState(false);
  }
}

function renderRestaurants(restaurants) {
  resultsContainer.innerHTML = '';

  if (!restaurants.length) {
    renderState('No restaurants found', 'Try a larger city name or a nearby area.');
    clearPagination();
    return;
  }

  const fragment = document.createDocumentFragment();

  restaurants.forEach((restaurant) => {
    fragment.appendChild(buildRestaurantNode(restaurant));
  });

  resultsContainer.appendChild(fragment);
}

function renderState(title, message) {
  resultsContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <img src="/location_illustration.png" alt="" class="empty-illustration" />
      </div>
      <p class="empty-title">${title}</p>
      <p class="empty-copy">${message}</p>
    </div>
  `;
}

function renderPagination() {
  if (searchState.totalPages <= 1) {
    clearPagination();
    return;
  }

  paginationMeta.textContent = `Page ${searchState.page} of ${searchState.totalPages}`;

  const buttons = [];
  const visiblePages = getVisiblePages(searchState.page, searchState.totalPages);

  buttons.push(createPaginationButton('Previous', searchState.page - 1, searchState.page === 1));

  visiblePages.forEach((page) => {
    buttons.push(createPaginationButton(String(page), page, false, page === searchState.page));
  });

  buttons.push(
    createPaginationButton('Next', searchState.page + 1, searchState.page === searchState.totalPages)
  );

  paginationContainer.innerHTML = buttons.join('');
}

function createPaginationButton(label, page, disabled, active = false) {
  const className = active ? 'pagination-button is-active' : 'pagination-button';
  return `
    <button
      type="button"
      class="${className}"
      data-page="${page}"
      ${disabled ? 'disabled' : ''}
      ${active ? 'aria-current="page"' : ''}
    >
      ${label}
    </button>
  `;
}

function getVisiblePages(currentPage, totalPages) {
  const pages = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (!pages.includes(1)) {
    pages.unshift(1);
  }

  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return [...new Set(pages)];
}

function buildStatusMessage(payload) {
  const effectivePageSize = payload.pageSize || PAGE_SIZE;
  const start = (searchState.page - 1) * effectivePageSize + 1;
  const end = start + payload.restaurants.length - 1;
  return `Showing ${start}-${end} of ${payload.total} restaurant results for ${payload.city}.`;
}

function clearPagination() {
  paginationMeta.textContent = '';
  paginationContainer.innerHTML = '';
}

function setLoadingState(isLoading, message = '') {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'Searching...' : 'Search';
  if (message) {
    statusText.textContent = message;
  }
}

function formatCoordinate(value) {
  return typeof value === 'number' ? value.toFixed(5) : 'Unavailable';
}

function buildRestaurantNode(restaurant) {
  const node = template.content.cloneNode(true);
  const image = node.querySelector('.restaurant-image');
  image.src = restaurant.imageUrl || buildFallbackImage(restaurant.name);
  image.alt = `${restaurant.name} restaurant photo`;

  node.querySelector('.restaurant-name').textContent = restaurant.name;
  node.querySelector('.rating').textContent = `${restaurant.rating} / 5`;
  node.querySelector('.address').textContent = restaurant.address || 'Address unavailable';
  node.querySelector('.latitude').textContent = formatCoordinate(restaurant.coordinates.latitude);
  node.querySelector('.longitude').textContent = formatCoordinate(restaurant.coordinates.longitude);

  const categories = node.querySelector('.categories');
  if (categories) {
    categories.textContent = restaurant.categories?.length
      ? restaurant.categories.join(' • ')
      : 'Restaurant';
  }

  const reviewCount = node.querySelector('.review-count');
  if (reviewCount) {
    reviewCount.textContent = `${restaurant.reviewCount || 0} reviews`;
  }

  const price = node.querySelector('.price');
  if (price) {
    if (restaurant.price) {
      price.textContent = restaurant.price;
      price.hidden = false;
    } else {
      price.hidden = true;
    }
  }

  return node;
}

function buildFallbackImage(name) {
  const label = encodeURIComponent(name || 'Restaurant');
  return `https://placehold.co/800x560/f3e7d7/2e221d?text=${label}`;
}
