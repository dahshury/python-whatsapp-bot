# My WhatsApp Bot Calendar Frontend

This is the Next.js frontend for the WhatsApp Bot reservation system.

## Development

### Quick Start
```bash
npm install
npm run dev
```

### Error Recovery & Troubleshooting

If you encounter JavaScript bundle corruption errors like "Invalid or unexpected token" after the development server has been running for a while, use these recovery commands:

#### Basic Recovery
```bash
# Clean build cache and restart
npm run dev:clean
```

#### Full Reset
```bash
# Complete reset (clears cache and reinstalls dependencies)
npm run dev:reset
```

#### Manual Cleanup
```bash
# Clean all build artifacts and caches
npm run clean
```

#### During Development
- Press `Ctrl+Shift+R` in browser for automatic error recovery
- The app includes automatic error boundaries for graceful error handling
- Bundle corruption is automatically detected and recovery is attempted

### Common Issues

1. **"Invalid or unexpected token" errors**: Usually caused by HMR bundle corruption
   - Solution: Use `npm run dev:clean` or refresh the page
   
2. **Calendar skeleton not loading**: Check browser console for detailed error info
   - Solution: Error boundary will show recovery options
   
3. **Hot reload not working**: Clear Next.js cache
   - Solution: `npm run dev:clean`

## Features

- 🗓️ FullCalendar integration with skeleton loading
- 🛡️ Automatic error recovery system
- 🎨 Modern UI with Tailwind CSS
- 🌙 Dark/Light theme support
- 🌍 RTL/LTR language support
- 📱 Responsive design

## Architecture

- **Next.js 15** with App Router
- **React 19** with strict mode
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Radix UI** for components
- **Error Boundaries** for graceful error handling

## Scripts

- `npm run dev` - Start development server
- `npm run dev:clean` - Clean build and start development
- `npm run dev:reset` - Full reset and start development
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run clean` - Clean all build artifacts

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
