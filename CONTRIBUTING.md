# Contributing to One For All

Thank you for your interest in contributing! This document provides guidelines for contributing to the One For All platform.

## 🏗️ Project Structure

This is a monorepo containing:
- `apps/backend/` - Python CrewAI agents
- `apps/dashboard/` - Next.js frontend
- `packages/` - Shared code (future)

## 🚀 Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/your-username/one-for-all.git
cd one-for-all
```

### 2. Install Dependencies

```bash
# Root dependencies (turbo, prettier)
pnpm install

# Backend
cd apps/backend
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Frontend
cd apps/dashboard
pnpm install
```

### 3. Set Up Environment

```bash
# Backend
cp apps/backend/.env.local.example apps/backend/.env.local

# Frontend
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

Edit `.env.local` files with your Supabase credentials.

## 📝 Coding Standards

### Frontend (TypeScript/React)

- **Linter**: ESLint + Prettier
- **Formatting**: Automatic on save (see `.vscode/settings.json`)
- **Type Safety**: Strict TypeScript mode
- **Component Style**: Functional components with hooks
- **File Naming**: `PascalCase.tsx` for components, `camelCase.ts` for utilities

```tsx
// ✅ Good
export function MyComponent({ title }: { title: string }) {
  return <div>{title}</div>
}

// ❌ Bad
export default ({ title }) => <div>{title}</div>
```

### Backend (Python)

- **Linter**: Black + isort
- **Style Guide**: PEP 8
- **Type Hints**: Required for all functions
- **Docstrings**: Google style

```python
# ✅ Good
def process_application(application_id: str) -> dict:
    """
    Process university application.

    Args:
        application_id: UUID of application

    Returns:
        dict: Processing result
    """
    pass

# ❌ Bad
def process_application(id):
    pass
```

## 🔧 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

Follow these practices:
- Write tests for new features
- Update documentation
- Run linters before committing

```bash
# Frontend
cd apps/dashboard
pnpm lint
pnpm type-check
pnpm test

# Backend
cd apps/backend
black .
isort .
pytest
```

### 3. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode toggle
fix: resolve theme flash on page load
docs: update installation instructions
test: add tests for Hero component
refactor: simplify button variants
chore: update dependencies
```

### 4. Pre-Commit Hooks

Husky runs automatically before each commit:
- Formats code with Prettier
- Fixes ESLint errors
- Runs type checking

If hooks fail, fix issues and recommit.

### 5. Push & Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Screenshots (for UI changes)
- Link to related issues
- Test results

## 🧪 Testing

### Frontend Tests

```bash
cd apps/dashboard

# Run tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

Write tests for:
- All components
- Custom hooks
- Utility functions
- Critical user flows

### Backend Tests

```bash
cd apps/backend

# Run all tests
pytest

# Specific test
pytest tests/unit/test_data_intake_agent.py

# With coverage
pytest --cov=src --cov-report=html
```

Write tests for:
- Agent responses
- Tool functionality
- Database operations
- Security policies

## 📦 Adding Dependencies

### Frontend

```bash
cd apps/dashboard

# Add dependency
pnpm add package-name

# Add dev dependency
pnpm add -D package-name
```

### Backend

```bash
cd apps/backend

# Add to pyproject.toml
poetry add package-name

# Or with pip
pip install package-name
```

Always commit lock files (`pnpm-lock.yaml`, `pyproject.toml`).

## 📚 Documentation

Update documentation when:
- Adding new features
- Changing APIs
- Modifying database schema
- Updating configuration

Documentation locations:
- Frontend README: `apps/dashboard/README.md`
- Backend README: `apps/backend/README.md`
- Architecture docs: `apps/backend/docs/`
- Component docs: Inline with TypeDoc/JSDoc

## 🐛 Reporting Bugs

Use the [GitHub issue tracker](https://github.com/your-org/one-for-all/issues).

Include:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/error messages
- Environment (OS, browser, Node version, etc.)

## ✨ Feature Requests

Feature requests are welcome! Please:
- Check existing issues first
- Describe the problem you're solving
- Suggest potential solutions
- Consider implementation complexity

## 🔒 Security

Report security vulnerabilities privately to security@oneforall.platform.

**Do NOT** create public issues for security bugs.

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

## 💬 Communication

- GitHub Issues: Bug reports, feature requests
- GitHub Discussions: Questions, ideas
- Pull Requests: Code contributions

## ❓ Questions?

Feel free to:
- Open a GitHub Discussion
- Ask in Pull Request comments
- Reach out to maintainers

Thank you for contributing to One For All! 🎉
