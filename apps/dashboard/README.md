# One For All - Admissions Dashboard

Multi-tenant admissions management platform with AI-powered agents.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the landing page.

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Database**: Supabase (PostgreSQL + Realtime)
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + Prettier

## 📁 Project Structure

```
dashboard/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   └── providers.tsx       # Theme & state providers
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   └── ThemeToggle.tsx
│   ├── layout/             # Layout components
│   │   └── LandingLayout.tsx
│   ├── landing/            # Landing page sections
│   │   ├── Hero.tsx
│   │   └── Footer.tsx
│   └── branding/           # Brand assets
│       └── Logo.tsx
├── lib/
│   ├── utils.ts            # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   └── supabase/           # Supabase client config
└── public/                 # Static assets
```

## 🎨 Features

### Landing Page

- ✅ Light/Dark mode toggle
- ✅ Dotted background pattern (starfield effect)
- ✅ 3D bubble-letter logo with gradients
- ✅ Responsive design
- ✅ Register & Sign in CTAs

### Theme System

The app uses `next-themes` for seamless theme switching:

```tsx
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()
setTheme('dark') // or 'light'
```

Background pattern adapts automatically:
- **Light mode**: Beige (#fdfcf9) with dark dots
- **Dark mode**: Near-black (#0a0a0a) with light dots

## 🔧 Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # TypeScript type checking
pnpm format       # Format code with Prettier
pnpm test         # Run tests
```

### Code Quality

Pre-commit hooks (Husky + lint-staged) automatically:
- Format code with Prettier
- Fix ESLint errors
- Run type checking

### Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

## 🗄️ Database Schema

The dashboard will connect to a multi-tenant Supabase database. See `apps/backend/docs/unified-schema-design.md` for the complete schema.

### Environment Variables

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🚧 Roadmap

- [ ] Implement Supabase Auth (login/register)
- [ ] Add applicant dashboard (`/my-applications`)
- [ ] Build institution dashboard (`/dashboard/[institution_slug]`)
- [ ] Integrate React Flow sandbox
- [ ] Add realtime application updates
- [ ] Implement agent configuration UI

## 📚 Documentation

- [Frontend Architecture](../../apps/backend/docs/frontend-architecture.md)
- [Multi-Tenant Schema](../../apps/backend/docs/unified-schema-design.md)
- [Agent Customization](../../apps/backend/docs/dynamic-agent-loader-spec.md)

## 🤝 Contributing

1. Follow the existing code style
2. Run `pnpm format` before committing
3. Ensure all tests pass
4. Add tests for new features

## 📝 License

© 2025 One For All. All rights reserved.
