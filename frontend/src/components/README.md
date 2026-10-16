# Components Directory

This directory contains all React components for the ENGIDA application.

## Structure

```
components/
├── ui/          # Basic UI components (Button, Input, Card, etc.)
├── layout/      # Layout components (Header, Footer, Sidebar, etc.)
├── property/    # Property-related components
├── listing/     # Listing-related components
├── search/      # Search components
└── ai/          # AI-powered components
```

## Guidelines

- Keep components small and focused
- Use TypeScript for all components
- Include proper prop types and JSDoc comments
- Prefer composition over prop drilling
- Use Tailwind CSS for styling
- Make components responsive by default

## Naming Conventions

- Use PascalCase for component files (e.g., `PropertyCard.tsx`)
- Use descriptive names that indicate the component's purpose
- Group related components in feature-specific folders
