# GitHub Copilot Instructions

## Method Parameter Guidelines

When writing a new method that needs to receive more than 3 parameters, use an object destructuring pattern instead of individual parameters for better readability and maintainability.

### ✅ Preferred Pattern (More than 3 parameters):

```typescript
private async fetchQuotesWithToken({
  payloadFormatted,
  apiKey,
  config,
  messages,
}: {
  payloadFormatted: any;
  apiKey: string;
  config: GlobalConfigsDoc;
  messages: string[];
}): Promise<ExtApiGetQuoteResponse> {
  // method implementation
}
```

### ❌ Avoid Pattern (More than 3 parameters):

```typescript
private async fetchQuotesWithToken(
  payloadFormatted: any,
  apiKey: string,
  config: GlobalConfigsDoc,
  messages: string[],
): Promise<ExtApiGetQuoteResponse> {
  // method implementation
}
```

### Benefits:

- **Improved readability**: Parameter names are clear at call site
- **Better maintainability**: Easy to add/remove parameters without breaking existing calls
- **Self-documenting**: The object structure serves as inline documentation
- **IDE support**: Better autocomplete and parameter hints

## Type Safety Guidelines

Avoid using the `any` type. Instead, create proper interfaces for better type safety and code documentation.

### ✅ Preferred Pattern (Create proper interfaces):

1. **Create interface in the appropriate `<folder-name>.interface.ts` file:**

```typescript
// src/t1/t1.interface.ts
export interface T1FormattedPayload {
  origin: string;
  destination: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  storeId: string;
}
```

2. **Import and use the interface:**

```typescript
// src/t1/services/t1.service.ts
import { T1FormattedPayload } from '../t1.interface';

private async fetchQuotesWithToken({
  payloadFormatted,
  apiKey,
  config,
  messages,
}: {
  payloadFormatted: T1FormattedPayload;
  apiKey: string;
  config: GlobalConfigsDoc;
  messages: string[];
}): Promise<ExtApiGetQuoteResponse> {
  // method implementation
}
```

### ❌ Avoid Pattern (Using any type):

```typescript
private async fetchQuotesWithToken({
  payloadFormatted,
  apiKey,
  config,
  messages,
}: {
  payloadFormatted: any; // ❌ Avoid this
  apiKey: string;
  config: GlobalConfigsDoc;
  messages: string[];
}): Promise<ExtApiGetQuoteResponse> {
  // method implementation
}
```

### Process:

1. **Locate the interface file**: Look for `<folder-name>.interface.ts` in the current module folder
2. **Create the interface**: Define the proper type structure based on the data being used
3. **Import the interface**: Add the import statement in the service file
4. **Replace `any` type**: Use the new interface instead of `any`

### Benefits:

- **Type safety**: Catch errors at compile time
- **Better IDE support**: Autocomplete and IntelliSense
- **Self-documenting**: Interfaces serve as documentation
- **Maintainability**: Easier to refactor and understand code structure

## ESLint and Code Quality Guidelines

Focus primarily on functionality and type safety rather than minor ESLint formatting issues. Only address ESLint errors when they relate to:

### ✅ Priority ESLint Issues (Address these):

- **Type safety errors**: `@typescript-eslint/no-unsafe-*` rules
- **Unused variables/imports**: `@typescript-eslint/no-unused-vars`
- **Missing return types**: `@typescript-eslint/explicit-function-return-type`
- **Any type usage**: `@typescript-eslint/no-explicit-any`

### ❌ Low Priority ESLint Issues (Don't focus on these unless specifically requested):

- **Formatting issues**: Spacing, line breaks, indentation
- **Method binding**: `@typescript-eslint/unbound-method` (unless causing runtime issues)
- **Prefer readonly**: `@typescript-eslint/prefer-readonly`
- **Naming conventions**: `@typescript-eslint/naming-convention` (unless severely impacting readability)

### Guidelines:

1. **Functionality first**: Ensure code works correctly before addressing style issues
2. **Type safety second**: Fix type-related ESLint errors as they improve code quality
3. **Formatting last**: Only address formatting ESLint issues if specifically requested
4. **Use eslint disable comments sparingly**: Only when the rule doesn't apply to the specific context

### Benefits:

- **Faster development**: Focus on what matters most
- **Better prioritization**: Address issues that impact functionality and maintainability first
- **Reduced noise**: Avoid getting distracted by minor formatting issues

## Test Execution Guidelines

When working with tests, avoid unnecessary test runs to save time and resources.

### ✅ When to Run Tests:

- After making code changes that could affect test outcomes
- When explicitly asked to verify test results
- When debugging failing tests
- After fixing test files

### ❌ When NOT to Run Tests:

- If tests are already confirmed to be passing
- Multiple times in succession without code changes
- After every minor change when no test-affecting modifications were made

### Guidelines:

1. **Trust previous test results**: If tests just passed, don't re-run them
2. **Batch your changes**: Make related changes together, then test once
3. **Targeted testing**: Run specific test files (`npm test -- <file>`) instead of the entire suite when possible
4. **Confirmation-based execution**: Only run tests when explicitly asked or when code changes warrant verification

### Benefits:

- **Faster workflow**: Reduce unnecessary waiting time
- **Resource efficiency**: Save CPU and time resources
- **Better focus**: Spend time on development rather than redundant verification
