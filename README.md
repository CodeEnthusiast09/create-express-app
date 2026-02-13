# @codeenthusiast09/create-express-app

[![npm version](https://badge.fury.io/js/@codeenthusiast09%2Fcreate-express-app.svg)](https://www.npmjs.com/package/@codeenthusiast09/create-express-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI tool to generate production-ready Express TypeScript projects with flexible database options.

## Usage

```bash
# Using npx (recommended - always uses latest version)
npx @codeenthusiast09/create-express-app my-project

# Or install globally
npm install -g @codeenthusiast09/create-express-app
create-express-app my-project
```

## What You Get

- **Clean Architecture** - NestJS-inspired modular structure
- **Type Safety** - Strict TypeScript configuration with path aliases
- **Validation** - Request validation with Zod
- **Logging** - Structured logging with Pino
- **Configuration** - Type-safe config with environment validation
- **Database Flexibility** - Choose MongoDB, PostgreSQL with Prisma, or PostgreSQL with Drizzle
- **Code Quality** - ESLint + Prettier configured
- **Docker** - Optional Docker setup with multi-stage builds
- **Testing** - Jest configured and ready

## Interactive Setup

The CLI will ask you:

1. **Project name** - Name of your project
2. **Database** - MongoDB or PostgreSQL
3. **ORM** (if PostgreSQL) - Prisma or Drizzle
4. **Docker** - Include Docker setup? (Yes/No)

## What Happens

1. ✓ Copies template files
2. ✓ Configures database based on your choice
3. ✓ Installs dependencies
4. ✓ Initializes git repository
5. ✓ Creates initial commit
6. ✓ Shows next steps

## Database Options

### MongoDB with Mongoose

- Simple, flexible schema
- Great for rapid development
- NoSQL advantages

### PostgreSQL with Prisma

- Best-in-class DX
- Powerful migrations
- Auto-generated types
- Recommended for most projects

### PostgreSQL with Drizzle

- Maximum type safety
- Better performance than Prisma
- SQL-like API
- For advanced users

## Development

```bash
# Clone the repository
git clone https://github.com/CodeEnthusiast09/create-express-app.git
cd create-express-app

# Install dependencies
npm install

# Run in development mode
npm run dev -- my-test-project

# Build for production
npm run build

# Test the built version
node dist/index.js my-test-project
```

## License

MIT
