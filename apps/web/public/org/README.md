# Organization / brand assets

The dashboard and login screen load **`UILogo.webp`** from this folder (see `~/components/branding/site-logo.tsx`, constant `SITE_LOGO_SRC`).

- To swap the logo, replace **`UILogo.webp`** or change `SITE_LOGO_SRC` to another file in this directory.
- Prefer **WebP** or **SVG** for size; use a **2×** resolution source for sharp display on retina screens.
- The UI caps width (**~160px** sidebar, **~200px** login) and uses `object-contain`.
