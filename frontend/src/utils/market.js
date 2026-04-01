const MARKETS = {
  us: {
    code: 'us',
    label: 'US',
    sessionLabel: 'US Market',
    currency: 'USD',
    locale: 'en-US',
    timezone: 'America/New_York',
  },
  india: {
    code: 'india',
    label: 'India',
    sessionLabel: 'India Market',
    currency: 'INR',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
  },
};

const SESSION_TONE = {
  open: 'text-emerald-300',
  pre: 'text-sky-300',
  after: 'text-amber-300',
  closed: 'text-slate-100',
};

const formatterCache = new Map();

function getCurrencyFormatter(market, minimumFractionDigits, maximumFractionDigits) {
  const cacheKey = `${market.code}:${minimumFractionDigits}:${maximumFractionDigits}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(market.locale, {
    style: 'currency',
    currency: market.currency,
    minimumFractionDigits,
    maximumFractionDigits,
  });
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function resolveMarket(marketOrTicker) {
  if (marketOrTicker?.code && MARKETS[marketOrTicker.code]) {
    return MARKETS[marketOrTicker.code];
  }

  if (marketOrTicker === 'india' || marketOrTicker === 'us') {
    return MARKETS[marketOrTicker];
  }

  return getMarketForTicker(marketOrTicker);
}

function getClockParts(timezone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

  return {
    weekday,
    minutes: hour * 60 + minute,
  };
}

function closedSession(market) {
  return {
    marketCode: market.code,
    marketLabel: market.label,
    label: `${market.sessionLabel} Closed`,
    shortLabel: 'Closed',
    tone: SESSION_TONE.closed,
    isOpen: false,
  };
}

export function getMarketForTicker(ticker) {
  const symbol = String(ticker || '').trim().toUpperCase();
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
    return MARKETS.india;
  }
  return MARKETS.us;
}

export function getMarketSession(marketOrTicker, date = new Date()) {
  const market = resolveMarket(marketOrTicker);
  const { weekday, minutes } = getClockParts(market.timezone, date);
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);

  if (!isWeekday) {
    return closedSession(market);
  }

  if (market.code === 'india') {
    if (minutes < 540) {
      return closedSession(market);
    }

    if (minutes < 555) {
      return {
        marketCode: market.code,
        marketLabel: market.label,
        label: 'India Pre-Open',
        shortLabel: 'Pre-Open',
        tone: SESSION_TONE.pre,
        isOpen: false,
      };
    }

    if (minutes < 930) {
      return {
        marketCode: market.code,
        marketLabel: market.label,
        label: 'India Market Open',
        shortLabel: 'Open',
        tone: SESSION_TONE.open,
        isOpen: true,
      };
    }

    return closedSession(market);
  }

  if (minutes < 240) {
    return closedSession(market);
  }

  if (minutes < 570) {
    return {
      marketCode: market.code,
      marketLabel: market.label,
      label: 'US Pre-Market',
      shortLabel: 'Pre-Market',
      tone: SESSION_TONE.pre,
      isOpen: false,
    };
  }

  if (minutes < 960) {
    return {
      marketCode: market.code,
      marketLabel: market.label,
      label: 'US Market Open',
      shortLabel: 'Open',
      tone: SESSION_TONE.open,
      isOpen: true,
    };
  }

  if (minutes < 1200) {
    return {
      marketCode: market.code,
      marketLabel: market.label,
      label: 'US After Hours',
      shortLabel: 'After Hours',
      tone: SESSION_TONE.after,
      isOpen: false,
    };
  }

  return closedSession(market);
}

export function getAllMarketSessions(date = new Date()) {
  return {
    us: getMarketSession('us', date),
    india: getMarketSession('india', date),
  };
}

export function formatCurrencyValue(value, marketOrTicker, options = {}) {
  const market = resolveMarket(marketOrTicker);
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '--';
  }

  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  return getCurrencyFormatter(market, minimumFractionDigits, maximumFractionDigits).format(numericValue);
}

export function getTickerDisplaySymbol(ticker) {
  return String(ticker || '')
    .trim()
    .toUpperCase()
    .replace(/\.(NS|BO)$/, '');
}
