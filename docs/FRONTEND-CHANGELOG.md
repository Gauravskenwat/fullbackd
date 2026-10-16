# SmartBus + TrackB (merged)

- `index.html` – SmartBus home page
- `trackb-signup/` – TrackB sign-up / log-in page (own CSS, JS, assets)
- `tracking/` – SmartBus Live Tracking page (own CSS, JS, assets)
- `services/` – SmartBus Services page (Route Search, Bus Booking, Seat Reservation, Online Payment, Cancel Booking)
- `history/` – SmartBus Trip History page (filter buttons, search, sort, trip details, cancel, receipt, rating)
- `profile/` – SmartBus My Profile page (My Profile + My Bookings tabs)
  - `profile/payment-methods/` – Payment Methods page
  - `profile/notifications/` – Notifications page
  - `profile/saved-routes/` – Saved Routes page
  - `profile/settings/` – Settings page

## How they connect
- Home **Login** button  -> `trackb-signup/index.html?mode=login` (opens in Log in view)
- Home **Sign Up** button -> `trackb-signup/index.html?mode=signup`
- Home's Profile menu item leads to the profile page; **History** and the **Booking History** service button open `history/index.html`
- On the sign-up page, the **TrackB logo** and **Back to Home** return to `../index.html`

- Home **Live Tracking** service button -> `tracking/index.html`
- On the tracking page, the SmartBus logo returns to `../index.html`

- Home **Profile** (top menu) -> `profile/index.html`; tracking page's **Profile** and *My profile* menu item also open it
- Profile page: logo / Home / Book Ticket / Track Bus / Services link back to the other pages; **Login** / **Sign Up** open the TrackB page; **Logout** returns home

- Profile sidebar tabs: Payment Methods / Notifications / Saved Routes / Settings open their own pages; each of those pages' sidebar links back to the others and to My Profile / My Bookings
- All five profile pages share the same header, footer and Login / Sign Up / Logout links
- Each page keeps its own data in the browser (separate localStorage keys), so data is not shared between them yet

## History page
- Every **History** button (home, tracking, all five profile pages) and every footer **My Trips** link opens `history/index.html`
- Filter buttons: All trips / Upcoming / Completed / Cancelled (sidebar and chips; `?filter=completed` also works), plus search and sort
- **Details** dialog: full trip info, rate a completed trip, download a text receipt, cancel an upcoming booking, remove a past trip from the list
- **Track bus** opens the tracking page; **Book again** opens the home page with From / To pre-filled
- Cancellations, ratings and removed trips are saved in the browser (`sb_history`) and the profile's My Bookings tab shows the same cancellations

## Branding & images
- The home page has a dark theme too. It follows the system setting or the Dark theme switch in Profile → Settings (the only place to change it). Home also has an auto-sliding offers carousel, offer/coupon, how-it-works, stats, reviews, FAQ and sign-up sections, a back-to-top button and a mobile bottom navigation bar
- The TrackB logo is the new bus mark in light and dark versions on every page: each page folder has `logo.png` (light theme), `logo-dark.png` and `footer-logo.png` (dark theme/footer); the home page and signup use the mark-only `smartbus-logo(-dark).png` / `trackb-mark(-dark).png`. Dark mode swaps the logo automatically (system setting or the Settings toggle)
- Photos were upscaled 3-4x and sharpened

## Run
Open `index.html` in a browser, or run `python -m http.server 8000` in this folder.

## Update: themes, live map, Indian data, team
- **Theme**: `theme.js` (loaded in every page's head) applies Light / Dark / System. The ONLY control is Profile -> Settings -> Theme; every page (home, login, sign up, tracking + map, services, history, profile pages) just follows it. Saved in `localStorage` key `sb_theme`.
- **Live map** (`tracking/`): Leaflet + OpenStreetMap/CARTO tiles (light & dark styles that follow the theme), Satellite view (Esri), real road route Delhi to Manali from the OSRM public router, bus marker with exact live coordinates, reverse-geocoded place name, "my location" (browser GPS), full screen and "Open in Google Maps". Needs internet; offline it falls back to the old static image. Bus movement is a simulated 8x time-lapse; connect a real GPS feed to `update()` in `tracking/script.js` for live data.
- **Data**: Indian operators (HRTC, MSRTC, RSRTC, PRTC, SRS, VRL ...), Indian customers/addresses, INR, 2026 dates.
- **Developers** now live on their own page `developers/index.html` (linked from every footer, no longer in Settings): Gaurav Kenwat (CEO & Founder), Devesh Kaushik (Co-Founder & CTO), Nishant Paul (Co-Founder & CFO) + company pictures. Put real photos in `developers/assets/team/` as gaurav.jpg, devesh.jpg, nishant.jpg (or use the Add photo button on each card).

## Update: images, footer, vertical lists, offers, ads, help chatbot
- **Images**: every photo re-encoded at high quality (2x Lanczos + light sharpening, JPEG q95); logos kept lossless. New `assets/coupons/` and `assets/ads/` images.
- **Footer** (home, history, services, all 5 profile pages): working links, new `pages/` (about, help, careers, terms, privacy, contact), mailto/tel/map links, social icons, newsletter saved in `sb_newsletter`. Social links point to each network's home page: put your real profile URLs in the footer markup.
- **Vertical lists**: profile/history/services side menu is now a vertical list on tablet/mobile (no sideways scrollbar); Live departures on home is a vertical list on mobile.
- **Offers & discounts**: coupon cards are filled with photos; offer slide 4 uses a photo too.
- **Sliding ads** (home page only): a banner carousel at the bottom, same style as the top offers slider (auto-slides, dots, arrows, progress bar, swipe). Partner ads are samples.
- **Artwork**: slide, coupon and ad images are custom vector illustrations rendered at high resolution (`assets/slides`, `assets/coupons`, `assets/ads`). Edit/regenerate by replacing those JPGs.
- **Help chatbot** (`shared/site.js`): floating "Help" button on every page. It answers from a built-in knowledge base (booking, refunds, tracking, payments, coupons, "Delhi to Manali" search links). To use a real AI, set `window.SB_CHAT_ENDPOINT` to your server (POST `{message, history}` -> `{reply}`).

## Update: Settings cleanup + working buttons
- Settings: "Company pictures" and its photos are removed. Developers is the last section of the Settings list, and a **Developers** item at the bottom of the profile side menu (all 5 profile pages) jumps straight to it (`profile/settings/index.html#developers`).
- Home: Search and every Live departures card open Services with From/To filled in; Discover More opens About.
- Profile pages: saved-route Book opens Services with the route; bell notifications open Track Bus / History / Profile.
- Settings: Terms/Privacy open their pages; Help Center dialog offers chat, Contact page and full Help Center; the Location switch asks the browser for permission and switches back off if blocked.
- Team photos you add with "Add photo" are stored in the browser. To ship them with the site, save them as `profile/settings/assets/team/gaurav.jpg`, `devesh.jpg`, `nishant.jpg`.

## Update: first slide, developers page, bus reviews, parcel delivery
- **Home slider**: your sunset bus banner is slide 1 (`assets/slides/slide-0.jpg`), 5 slides in total.
- **Developers**: `developers/` is a separate page; removed from Settings. Footer "Developers" link on every page.
- **Bus reviews**: under the live map on `tracking/` (rating summary, filters, helpful, write a review; saved in `sb_bus_reviews`).
- **Parcel & Luggage Delivery**: `delivery/` (send in 3 steps, track by consignment ID, my shipments, rates & rules). Data in `sb_parcels`; demo IDs TB10000001 / TB10000002. Linked from the home Services grid, the Services sidebar, footers and the Help chatbot. Prices/status are simulated; connect your backend in `delivery/script.js`.

## Update v6
- Slide 1 now has the same text layout as the other slides (tag, headline, text, button, code) on an enhanced, higher-resolution image.
- Developers is a separate option after Settings in the profile side menu (all profile pages) and opens `developers/index.html` with the original team data.
- Clicking a profile side-menu option scrolls to that section (shared/site.js).

## Update v7: mobile
- Audited all pages at 320/360/390/768 px: no horizontal scroll. Fixed coupon cards, bottom nav, newsletter box, tracking header, home search (stacks on phones), 16px form fields (no iOS zoom), larger tap targets.
