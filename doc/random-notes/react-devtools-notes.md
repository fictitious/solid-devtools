

## terminology

`backend` is the part which is injected into the page and has code called from react

`renderer` is part of the backend

## IDs

Devtools backend generates and assigns IDs to fibers (`getOrGenerateFiberID` in [`renderer.js`](https://github.com/facebook/react/blob/main/packages/react-devtools-shared/src/backend/renderer.js)), and has two maps:

```typescript
const fiberToIDMap: Map<Fiber, number> = new Map();

const idToArbitraryFiberMap: Map<number, Fiber> = new Map();
```
