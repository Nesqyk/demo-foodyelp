# Demo FooD Yelp

Simple JavaScript web app that searches real Yelp restaurant data for a given city and displays a clean, paginated list of results.

## Demo video

[![Watch Demo](https://img.shields.io/badge/Watch-Demo-1f6feb?style=for-the-badge)](https://nesqyk.github.io/demo-foodyelp/)

- Playable demo page: [https://nesqyk.github.io/demo-foodyelp/](https://nesqyk.github.io/demo-foodyelp/)
- Direct player link: [Jumpshare demo](https://jumpshare.com/embed/Bhljged2OsePdrCcmDE0)

## Features

- Real Yelp restaurant search by city
- Apple-inspired minimal UI
- Empty state illustration before search
- Pagination with up to 10 results per page
- Displays name, rating, address, and coordinates

## How it works

- The browser sends a city name to the local Node server.
- The server calls Yelp's Business Search API with:
  - `location=<city>`
  - `categories=restaurants`
  - `radius=8047` (about 5 miles)
  - `page` and `limit` mapped to Yelp `offset`
- The server returns only the fields needed by the UI.

## Requirements

- Node.js 18+ recommended
- A Yelp API key

## Setup

1. Clone the repo.
2. Copy `.env.example` to `.env`.
3. Add your Yelp API key to `.env`.

```env
YELP_API_KEY=your_real_key_here
PORT=3000
```

## Run locally

Start the server:

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

## Project structure

```text
.
|- public/
|  |- app.js
|  |- demo_yelp.mp4
|  |- styles.css
|  |- index.html
|  `- location_illustration.png
|- .env.example
|- .gitignore
|- README.md
`- server.js
```

## Notes

- This project uses no mock data.
- `.env` is ignored by git and should not be committed.
- The Yelp API key stays on the server and is never exposed in browser code.
- The app uses Node's built-in modules, so there is no dependency install step.
