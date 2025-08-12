export const brokerConfigs = {
  "RightBiz": {
    baseUrl: "https://rightbiz.com/business-for-sale",
    filters: [
      { type: 'click', selector: '[data-sector="information-technology"]' },
      { type: 'select', selector: 'select[name="location"]', value: 'united-kingdom' },
      { type: 'click', selector: '[data-sort="newest"]' }
    ],
    selectors: {
      listingContainer: '.business-card',
      title: '.business-title',
      link: 'a.business-link',
      date: '.listing-date'
    }
  },
  "Transworld Business Advisors": {
    baseUrl: "https://businessesforsale.com/search",
    filters: [
      { type: 'select', selector: 'select[name="industry"]', value: 'it-services' },
      { type: 'select', selector: 'select[name="region"]', value: 'united-kingdom' },
      { type: 'click', selector: 'button[type="submit"]' },
      { type: 'click', selector: '[data-sort="newest"]' }
    ],
    selectors: {
      listingContainer: '.listing-item',
      title: '.listing-title',
      link: 'a.listing-link',
      date: '.listing-date'
    }
  },
  "Daltonsbusiness": {
    baseUrl: "https://daltonsbusiness.com/businesses-for-sale",
    filters: [
      { type: 'click', selector: '[data-category="it-computing"]' },
      { type: 'select', selector: 'select[name="location"]', value: 'uk' },
      { type: 'click', selector: '.filter-new-only' }
    ],
    selectors: {
      listingContainer: '.business-listing',
      title: '.business-name',
      link: 'a.view-details',
      date: '.date-added'
    }
  },
  "Businessesforsale": {
    baseUrl: "https://businessesforsale.com/uk/it-businesses-for-sale",
    filters: [
      { type: 'select', selector: 'select[name="category"]', value: 'misc-it-consultancies' },
      { type: 'select', selector: 'select[name="region"]', value: 'united-kingdom' },
      { type: 'select', selector: 'select[name="sort"]', value: 'newest' },
      { type: 'select', selector: 'select[name="per_page"]', value: '50' }
    ],
    selectors: {
      listingContainer: '.result-item',
      title: '.result-title',
      link: '.result-link',
      date: '.result-date'
    }
  },
  "Hornblower": {
    baseUrl: "https://hornblowerbusiness.com/business-for-sale",
    filters: [
      { type: 'select', selector: 'select[name="sector"]', value: 'technology-b2b' },
      { type: 'select', selector: 'select[name="status"]', value: 'for-sale' },
      { type: 'click', selector: 'button.apply-filters' },
      { type: 'select', selector: 'select[name="sort"]', value: 'latest' }
    ],
    selectors: {
      listingContainer: '.opportunity-card',
      title: '.opportunity-title',
      link: '.opportunity-link',
      date: '.opportunity-date'
    }
  },
  "Business Sale Report": {
    baseUrl: "https://businesssalereport.co.uk/businesses-for-sale",
    filters: [
      { type: 'select', selector: 'select[name="sector"]', value: 'technology' },
      { type: 'click', selector: 'input[name="latest_only"]' },
      { type: 'click', selector: 'button[type="submit"]' }
    ],
    selectors: {
      listingContainer: '.report-listing',
      title: '.report-title',
      link: '.report-link',
      date: '.report-date'
    }
  },
  "Benchmark International": {
    baseUrl: "https://benchmarkintl.com/acquisition-opportunities",
    filters: [
      { type: 'select', selector: 'select[name="industry"]', value: 'it-services' },
      { type: 'select', selector: 'select[name="region"]', value: 'united-kingdom' },
      { type: 'click', selector: 'button.find-opportunities' }
    ],
    selectors: {
      listingContainer: '.flip-card',
      title: '.card-title',
      link: '.card-link',
      date: '.card-date'
    }
  },
  "BizSale": {
    baseUrl: "https://bizsale.com/business-for-sale",
    filters: [
      { type: 'select', selector: 'select[name="sector"]', value: 'technology' },
      { type: 'click', selector: 'input[name="exclude_pending"]' },
      { type: 'click', selector: 'button.search-btn' },
      { type: 'select', selector: 'select[name="sort"]', value: 'newest' }
    ],
    selectors: {
      listingContainer: '.business-card',
      title: '.card-title',
      link: '.card-link',
      date: '.card-date'
    }
  },
  "Smergers": {
    baseUrl: "https://smergers.com/businesses-for-sale/it-services-uk",
    filters: [
      { type: 'select', selector: 'select[name="transaction_type"]', value: 'businesses-for-sale' },
      { type: 'select', selector: 'select[name="location"]', value: 'united-kingdom' },
      { type: 'select', selector: 'select[name="industry"]', value: 'it-services' },
      { type: 'click', selector: 'button.apply-btn' },
      { type: 'click', selector: '.tab-newest' }
    ],
    selectors: {
      listingContainer: '.listing-row',
      title: '.listing-name',
      link: '.listing-url',
      date: '.listing-date'
    }
  },
  "EMF Group": {
    baseUrl: "https://emfgroup.co.uk/businesses-for-sale",
    filters: [
      { type: 'select', selector: 'select[name="business_type"]', value: 'it-computing' },
      { type: 'select', selector: 'select[name="geography"]', value: 'all' },
      { type: 'click', selector: 'button.search-btn' },
      { type: 'select', selector: 'select[name="order"]', value: 'date-newest' }
    ],
    selectors: {
      listingContainer: '.business-item',
      title: '.business-title',
      link: '.business-link',
      date: '.business-date'
    }
  },
  "Knightsbridge Commercial": {
    baseUrl: "https://knightsbridgecommercial.co.uk/buy-business",
    filters: [
      { type: 'select', selector: 'select[name="sector"]', value: 'it-services-support' },
      { type: 'select', selector: 'select[name="region"]', value: 'england' },
      { type: 'click', selector: 'button.update-results' }
    ],
    selectors: {
      listingContainer: '.commercial-listing',
      title: '.listing-title',
      link: '.listing-details',
      date: '.listing-added'
    }
  }
} as const;

export const brokerTiers = {
  1: "Flagship",
  2: "High Value", 
  3: "Medium Value",
  4: "Standard",
  5: "Low Value"
} as const;

export const listingStatuses = [
  "NEW",
  "CONTACTED", 
  "RESPONDED",
  "QUALIFIED",
  "CLOSED"
] as const;

export const statusColors = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-amber-100 text-amber-800", 
  RESPONDED: "bg-purple-100 text-purple-800",
  QUALIFIED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800"
} as const;
