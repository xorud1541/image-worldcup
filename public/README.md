# Oh My Wedding Day — Brand Assets

## Files

- `logo-horizontal.svg` — Main horizontal lockup (header, dark backgrounds use light variant)
- `logo-horizontal-light.svg` — Light variant for dark backgrounds
- `logo-mark.svg` — Floral mark only (compact placements)
- `logo-mark-light.svg` — Light variant
- `favicon.svg` — Modern browser favicon
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png` — PNG fallbacks
- `apple-touch-icon.png` (180×180) — iOS home screen
- `og-image.png` (1200×630) — Open Graph / 카카오톡 / 페이스북 공유

## Installation in wedding-pick (Vite + React)

### 1. Copy files to `public/`
Place all files in `wedding-pick/public/` so they're served at the site root:

```
public/
  ├── favicon.svg
  ├── favicon-32.png
  ├── apple-touch-icon.png
  ├── og-image.png
  └── logo-horizontal.svg
```

### 2. Update `index.html`

Replace the contents of `<head>` with:

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Oh My Wedding Day — 웨딩사진 이미지 월드컵</title>
<meta name="description" content="A gentle tournament for the wedding photograph you'll keep forever." />

<!-- Favicons -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://ohmyweddingday.com" />
<meta property="og:title" content="Oh My Wedding Day" />
<meta property="og:description" content="웨딩사진 이미지 월드컵 — 평생 간직할 사진을 가장 다정한 방식으로 고르세요." />
<meta property="og:image" content="https://ohmyweddingday.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Oh My Wedding Day" />
<meta name="twitter:description" content="웨딩사진 이미지 월드컵 — 평생 간직할 사진을 가장 다정한 방식으로 고르세요." />
<meta name="twitter:image" content="https://ohmyweddingday.com/og-image.png" />

<!-- Fonts (logo uses Cormorant Garamond) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,300&display=swap" rel="stylesheet" />

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VF85MV3534"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-VF85MV3534');
</script>
```

### 3. Replace the brand text in `App.jsx`

Find this in the topbar (around line 263):

```jsx
<header className="topbar">
  <div className="topbar-left">
    <span className="brand">ohmyweddingday</span>
  </div>
```

Replace with:

```jsx
<header className="topbar">
  <div className="topbar-left">
    <a href="/" className="brand-link" aria-label="Oh My Wedding Day">
      <img src="/logo-horizontal.svg" alt="Oh My Wedding Day" className="brand-logo" />
    </a>
  </div>
```

### 4. Update `styles.css`

Replace the `.brand` rule with:

```css
.brand-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.brand-logo {
  height: 28px;
  width: auto;
  display: block;
}

@media (max-width: 768px) {
  .brand-logo {
    height: 22px;
  }
}
```

## Color tokens (optional — for future polish)

```css
:root {
  --brand-cream: #fdf6f0;
  --brand-blush: #e8b4b8;
  --brand-mocha: #b08968;
  --brand-deep:  #3a2e2a;
}
```
