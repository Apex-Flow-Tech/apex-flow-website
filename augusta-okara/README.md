# Augusta Okara author site

A static site (HTML, CSS and vanilla JS) for science fiction author Augusta Okara, kept apart from the Apex Flow site.
Colours: black `#0A0A0A`, white `#FFFFFF`, orange `#E55800`. Look: giant lowercase wordmarks, half-circle "suns", rounded panels and pill buttons.

Pages: `index.html` (Home), `about.html` (About Me), `books.html` (My Recent Books), `faq.html` (FAQ), `speaking.html` (Speaking enquiries).

## Placeholders to replace before launch

- [ ] Bio text in `about.html` and the About block on `index.html` (anything in [square brackets])
- [ ] Book titles, years, blurbs and themes (the three books are invented samples)
- [ ] Cover art: put an `<img src="images/cover-name.jpg" alt="...">` inside each `.cover` block
- [ ] Author photo: a cut-out PNG (transparent background) works best. Replace the `<svg>` inside each `.photo` block with `<img src="images/augusta.png" alt="Augusta Okara">`
- [ ] Retailer buy links (`href="#"`) in `books.html`
- [ ] Review quotes on `index.html` and `books.html`
- [ ] FAQ answers marked [Placeholder] in `faq.html`
- [ ] Social links in the footer of every page
- [ ] `CONTACT_EMAIL` at the top of `js/main.js` (the forms open an email to this address)
- [ ] Remove the `noindex` meta tag from each page once the real content is in

## One-page version

`augusta-okara-onepage.html` is the whole site in a single self-contained file: Home, About, Books, FAQ and Speaking are sections on one page, and the CSS and JavaScript are inside the file. It only needs an internet connection for the Google font. Open it in any browser, or upload it as `index.html` to any host (GitHub Pages, Netlify, cPanel).
