# Maria's design tokens

Design tokens for the Maria design system.

This package ships generated token outputs for web, React, Web Components,
React Native, and tooling that needs JSON token data.

## Install

```sh
npm install @maria-ms/tokens
```

## Use In Web Apps

Import the CSS files once in your application shell.

```ts
import "@maria-ms/tokens/css/light";
import "@maria-ms/tokens/css/dark";
```

Light tokens are applied to `:root` and `[data-theme="light"]`. Dark tokens are
applied to `[data-theme="dark"]`.

```html
<html data-theme="light">
  ...
</html>
```

```css
.surface {
  background: var(--ds-semantic-color-background-default);
  color: var(--ds-semantic-color-foreground-default);
}

.field {
  background: var(--ds-component-input-color-background-default);
  border-color: var(--ds-component-input-color-border-default);
}
```

Prefer semantic and component tokens in product code. Primitive tokens are
available for low-level system work, but should not be the default app contract.

## Use In React

React apps should consume the CSS entry points at the app root.

```tsx
import "@maria-ms/tokens/css/light";
import "@maria-ms/tokens/css/dark";

export function App() {
  return <main data-theme="light">...</main>;
}
```

Use CSS custom properties in styles, CSS modules, CSS-in-JS, or component
libraries.

## Use In Web Components

Import the CSS entry points before registering or rendering components.

```ts
import "@maria-ms/tokens/css/light";
import "@maria-ms/tokens/css/dark";
```

Components should reference the generated CSS variables.

```css
:host {
  color: var(--ds-semantic-color-foreground-default);
}
```

## Use In React Native

Use the React Native entry point for native-compatible token objects.

```ts
import tokens from "@maria-ms/tokens/react-native/light";

const styles = {
  screen: {
    backgroundColor: tokens.semantic.color.background.default.$value,
  },
};
```

Use the matching theme entry point for the active app theme.

```ts
import lightTokens from "@maria-ms/tokens/react-native/light";
import darkTokens from "@maria-ms/tokens/react-native/dark";
```

## Use In JavaScript Tooling

Use the JavaScript entry points when you need token metadata in build tools,
documentation, tests, or code generation.

```ts
import tokens from "@maria-ms/tokens/js/light";

console.log(tokens.semantic.color.background.default.$value);
```

## Entry Points

The package root is intentionally not an import target. Use an explicit platform
and theme entry point.

| Entry point                           | Use                                       |
| ------------------------------------- | ----------------------------------------- |
| `@maria-ms/tokens/css/light`          | Light CSS custom properties               |
| `@maria-ms/tokens/css/dark`           | Dark CSS custom properties                |
| `@maria-ms/tokens/js/light`           | Light token object for JavaScript tooling |
| `@maria-ms/tokens/js/dark`            | Dark token object for JavaScript tooling  |
| `@maria-ms/tokens/react-native/light` | Light token object for React Native       |
| `@maria-ms/tokens/react-native/dark`  | Dark token object for React Native        |
| `@maria-ms/tokens/json/light`         | Light generated JSON output               |
| `@maria-ms/tokens/json/dark`          | Dark generated JSON output                |

## Output Contract

| Output                           | Contents                                   |
| -------------------------------- | ------------------------------------------ |
| `dist/css/*.css`                 | CSS custom properties for browser runtimes |
| `dist/js/*/tokens.mjs`           | ESM token objects with metadata            |
| `dist/react-native/*/tokens.mjs` | React Native-compatible ESM token objects  |
| `dist/json/*.json`               | Generated JSON token output                |

The npm package publishes only `dist`, `README.md`, and `package.json`.

## Source Pipeline

The source of truth starts in Figma Variables.

```text
Figma Export Modes
  -> sources/figma-export-modes
  -> validated intermediate token graph
  -> Style Dictionary
  -> dist
```

The build validates the token topology before generating output:

- primitive tokens feed semantic tokens
- semantic tokens feed component tokens
- light and dark modes have matching token coverage
- unresolved references and broken values fail the build
- exported files match the expected Figma mode names
- number dimensions follow Figma scopes and recipe path rules

Do not edit `dist` by hand. Update the Figma exports, then rebuild.

## Replacing Figma Exports

Export modes from the Figma Variables panel and replace the matching snapshot
files:

| Figma collection | Figma mode | File                                                     |
| ---------------- | ---------- | -------------------------------------------------------- |
| primitive        | Light      | `sources/figma-export-modes/primitive/Light.tokens.json` |
| tokens           | Light      | `sources/figma-export-modes/tokens/Light.tokens.json`    |
| tokens           | Dark       | `sources/figma-export-modes/tokens/Dark.tokens.json`     |

For local iteration, run:

```sh
npm run dev
```

The watcher rebuilds after each save. If files are replaced one at a time,
temporary validation failures are expected because aliases or light/dark coverage
can be out of sync until the last file is replaced. After all files are in
place, the next rebuild should succeed. Always run this before committing or
publishing:

```sh
npm run check
```

The build recipe in `src/recipe.mjs` defines the expected collections, modes,
theme selectors, and number-to-dimension policy. Update the recipe only when the
Figma source structure intentionally changes.

## Development

```sh
npm ci
npm run check
```

Useful commands:

| Command         | Does                                              |
| --------------- | ------------------------------------------------- |
| `npm run dev`   | Watches `sources` and `src`, then rebuilds `dist` |
| `npm run build` | Regenerates `dist`                                |
| `npm run test`  | Runs unit and contract tests                      |
| `npm run check` | Builds and tests the package                      |

## Publishing

Publishing is handled by the GitHub Actions workflow when a GitHub Release is
published. The package is configured for public npm publishing with provenance.
