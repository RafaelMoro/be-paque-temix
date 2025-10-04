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
