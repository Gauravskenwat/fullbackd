# TrackB responsive sign-up page

A responsive, dependency-free frontend inspired by the supplied TrackB reference screenshot.

## Run it

Open `index.html` in a modern browser. For a local server, run one of these commands from this folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Included interactions

- Responsive desktop, tablet, and mobile layouts
- Required-field, email, phone, password-length, and password-match validation
- Password visibility toggles
- Terms acceptance validation
- Sign-up / log-in view toggle
- Social sign-in demo feedback
- Back-to-home and policy-link demo feedback

## Production note

This is a frontend-only demo. It does not create accounts or authenticate users. Connect a backend/auth provider and OAuth credentials, and replace the demo navigation/policy actions with real URLs before deployment. The supplied screenshot was used to crop the hero artwork and TrackB mark into `assets/`.
