// The set of currencies people can choose when they sign up. Stripe requires
// charges and transfers to be created in one specific currency per request,
// so each user has exactly one currency for their whole account, and
// sending money is only allowed between two accounts on the same currency
// (see routes/payments.js) — real cross-currency transfers would need FX
// conversion, which this app doesn't implement.
const SUPPORTED_CURRENCIES = ['eur', 'usd', 'gbp', 'cad', 'aud'];

function isSupportedCurrency(code) {
  return SUPPORTED_CURRENCIES.includes(String(code || '').toLowerCase());
}

module.exports = { SUPPORTED_CURRENCIES, isSupportedCurrency };
