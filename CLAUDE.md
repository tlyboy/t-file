# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start development server
pnpm build    # TypeScript check + Vite build
pnpm preview  # Preview production build
```

## Tech Stack

- React 19 + TypeScript
- Vite (using rolldown-vite)
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- shadcn/ui (new-york style, lucide icons)
- React Compiler (babel-plugin-react-compiler)
- Immer for immutable state

## Architecture

**Path Aliases**: `@/*` maps to `./src/*`

**Project Structure**:
- `src/components/ui/` - shadcn/ui components (add via `npx shadcn@latest add <component>`)
- `src/components/` - Custom components (theme-provider, mode-toggle)
- `src/layouts/` - Layout components wrapping ThemeProvider
- `src/lib/utils.ts` - `cn()` helper for merging Tailwind classes

**Styling**:
- Tailwind v4 with CSS variables for theming (defined in `src/index.css`)
- Uses `oklch` color space for all theme colors
- Dark mode via `.dark` class on `<html>` (managed by ThemeProvider)
- View transitions enabled for theme switching

**State Management**:
- `useTheme()` hook from `@/components/theme-provider` for theme access
- Theme persisted to localStorage with key `vite-ui-theme`
