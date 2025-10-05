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
