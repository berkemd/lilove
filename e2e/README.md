# E2E Tests with Playwright

This directory contains end-to-end tests for critical user flows using Playwright.

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run tests in UI mode (interactive)
```bash
npx playwright test --ui
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### View test report
```bash
npx playwright show-report
```

## Test Coverage

The test suite covers the following critical user flows:

### Authentication (auth.spec.ts)
- User sign up with email/password
- User sign in with existing credentials
- OAuth authentication (Google)

### Goals Management (goals.spec.ts)
- Creating new goals
- Completing goals
- XP rewards for goal completion

### Habit Tracking (habits.spec.ts)
- Checking habits for the day
- Viewing streak information
- Rhythm score display

### AI Coach (coach.spec.ts)
- Sending messages to AI coach
- Receiving AI responses
- Generating action plans

### Settings (settings.spec.ts)
- Updating user profile
- Exporting user data
- Privacy settings

## Configuration

The Playwright configuration is defined in `playwright.config.ts` at the root of the project.

Key settings:
- Base URL: `http://localhost:5000`
- Browser: Chromium (Desktop Chrome)
- Screenshots: On failure only
- Trace: On first retry
- Retries: 2 (in CI), 0 (locally)

## CI/CD

Tests run automatically on push and pull requests via GitHub Actions.
See `.github/workflows/e2e.yml` for the CI configuration.

## Test Data

Tests use unique email addresses with timestamps to avoid conflicts:
```typescript
const timestamp = Date.now();
const email = `test${timestamp}@example.com`;
```

For tests that require existing users, use:
- Email: `test@example.com`
- Password: `password123`

## Adding New Tests

1. Create a new `.spec.ts` file in the `e2e` directory
2. Import test utilities: `import { test, expect } from '@playwright/test';`
3. Use `data-testid` attributes to select elements
4. Follow the existing test patterns for consistency

## Troubleshooting

### Browser installation issues
If chromium is not installed, run:
```bash
npx playwright install chromium
```

### Tests failing locally
- Ensure the dev server is running: `npm run dev`
- Check that the app is accessible at `http://localhost:5000`
- Clear browser cache and cookies

### Debugging failed tests
1. Run with `--headed` flag to see the browser
2. Use `--debug` flag to step through tests
3. Check screenshots in `test-results` directory
4. Review trace files for detailed debugging
