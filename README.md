# Clio - Bookmark Manager

A modern bookmark management application built with SvelteKit and TypeScript. Save, organize, and manage your favorite websites with a clean and intuitive interface.

## Features

- Add new bookmarks with automatic URL formatting
- Fetch bookmarks from API endpoint
- Archive bookmarks for later reference
- Clean and responsive UI with Tailwind CSS
- Real-time bookmark list updates

## Tech Stack

- **Framework**: SvelteKit 2.x with Svelte 5
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.x
- **Icons**: Lucide Svelte
- **Build Tool**: Vite

## API Endpoints

The application connects to a backend API running on `http://localhost:1323`:

- `GET /bookmarks?user_id=songpon` - Fetch user's bookmarks
- `POST /bookmerks` - Add a new bookmark (note the spelling)
- `POST /bookmarks/{bookmarkID}/archive` - Archive a bookmark

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm, pnpm, or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```sh
npm install
```

### Development

Start the development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

**Note**: Make sure your backend API is running on `http://localhost:1323` before using the application.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with:

```sh
npm run preview
```

```sh
npm run check

# or run in watch mode
npm run check:watch
```

## Deployment

To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Project Structure

```
clio/
├── src/
│   ├── lib/
│   │   └── components/  # Reusable UI components
│   └── routes/
│       └── +page.svelte # Main bookmark manager page
├── package.json
└── README.md
```

## License

Private project - version 0.0.1
