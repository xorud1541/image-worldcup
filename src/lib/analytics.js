const ga4MeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
  if (!ga4MeasurementId || initialized) {
    return;
  }

  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args) => {
    window.dataLayer.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", ga4MeasurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    ga4MeasurementId,
  )}`;
  document.head.appendChild(script);
}
