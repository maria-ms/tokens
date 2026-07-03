# Maria Design Tokens

This package provides generated token outputs for web apps, React, Web Components, React Native, and tooling that needs JSON or JavaScript token data.

Use this repo as the shared contract between design and engineering for primitive, semantic, and component tokens across light and dark mode.

## What this repo contains

This repo exposes three levels of tokens:

- **Primitive tokens**: raw design values such as color scales, spacing, radius, typography, and shadows.
- **Semantic tokens**: product-facing tokens that describe intent, such as background, foreground, border, focus, danger, or success.
- **Component tokens**: component-specific tokens for cases where a reusable component needs its own contract, such as inputs, buttons, or cards.

Product code should prefer **semantic** and **component** tokens.

Primitive tokens are available for low-level system work, but they should not be the default app contract.

## Preview

Include a small visual preview here if useful.

Recommended preview:

- light mode semantic colors
- dark mode semantic colors
- key foreground, background, border, accent, success, warning, and danger tokens

Do not treat screenshots as the source of truth. Screenshots are only a visual reference. The source of truth is the Figma Variables export and the generated token output.

```md
![Maria token preview](./docs/token-preview.png)
```

## Install

```sh
npm install @maria-ms/tokens
```

## Use in web apps

Import the CSS files once in your application shell.

```ts
import "@maria-ms/tokens/css/light";
import "@maria-ms/tokens/css/dark";
```

Light tokens are applied to:

```css
:root,
[data-theme="light"]
```

Dark tokens are applied to:

```css
[data-theme="dark"]
```

Set the active theme with `data-theme`.

```html
<html data-theme="light">
  ...
</html>
```

Use the generated CSS custom properties in product styles.

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

Avoid hardcoded design values in product code.

```css
/* Avoid */
color: #111827;

/* Prefer */
color: var(--ds-semantic-color-foreground-default);
```

## Use in React

React apps should consume the CSS entry points at the app root.

```tsx
import "@maria-ms/tokens/css/light";
import "@maria-ms/tokens/css/dark";

export function App() {
  return <main data-theme="light">...</main>;
}
```

Use CSS custom properties in styles, CSS modules, CSS-in-JS, or component libraries.

```tsx
export function Card({ children }: { children: React.ReactNode }) {
  return <section className="card">{children}</section>;
}
```

```css
.card {
  background: var(--ds-semantic-color-background-default);
  color: var(--ds-semantic-color-foreground-default);
  border: 1px solid var(--ds-semantic-color-border-default);
}
```

## Use in Web Components

Import the CSS entry points before registering or rendering components.

```ts
import "@maria-ms/tokens/css/light";
import "@maria-ms/tokens/css/dark";
```

Components should reference the generated CSS variables.

```css
:host {
  color: var(--ds-semantic-color-foreground-default);
  background: var(--ds-semantic-color-background-default);
}
```

## Use in React Native

Use the React Native entry points for native-compatible token objects.

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

## Use in JavaScript tooling

Use the JavaScript entry points when you need token metadata in build tools, documentation, tests, or code generation.

```ts
import tokens from "@maria-ms/tokens/js/light";

console.log(tokens.semantic.color.background.default.$value);
```

## Entry points

The package root is intentionally not an import target. Use an explicit platform and theme entry point.

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

## Output contract

| Output                            | Contents                                   |
| --------------------------------- | ------------------------------------------ |
| `dist/css/*.css`                  | CSS custom properties for browser runtimes |
| `dist/js/*/tokens.mjs`            | ESM token objects with metadata            |
| `dist/js/*/tokens.d.ts`           | TypeScript declarations for JS output      |
| `dist/react-native/*/tokens.mjs`  | React Native-compatible ESM token objects  |
| `dist/react-native/*/tokens.d.ts` | TypeScript declarations for RN output      |
| `dist/json/*.json`                | Generated JSON token output                |

The npm package publishes only:

```text
dist
README.md
package.json
```

Do not edit `dist` by hand.

## Token model

### Primitive tokens

Primitive tokens store raw values.

```json
{
  "primitive": {
    "color": {
      "blue": {
        "500": {
          "$value": "#2563EB"
        }
      }
    }
  }
}
```

Primitive tokens should mainly be used to define semantic and component tokens.

### Semantic tokens

Semantic tokens describe UI intent.

```json
{
  "semantic": {
    "color": {
      "background": {
        "default": {
          "$value": "{primitive.color.neutral.0}"
        }
      },
      "foreground": {
        "default": {
          "$value": "{primitive.color.neutral.950}"
        }
      }
    }
  }
}
```

Product teams should use semantic tokens by default.

### Component tokens

Component tokens define reusable component-level decisions.

```json
{
  "component": {
    "input": {
      "color": {
        "background": {
          "default": {
            "$value": "{semantic.color.background.default}"
          }
        },
        "border": {
          "default": {
            "$value": "{semantic.color.border.default}"
          }
        }
      }
    }
  }
}
```

Use component tokens when a component needs a stable API that should not leak implementation details.

## Modes

This token system supports:

- light mode
- dark mode

Light and dark modes must have matching semantic and component token coverage.

Mode-specific values should live in the semantic or component layer, not in product code.

## Naming convention

Token names should describe usage, not appearance.

Good:

```text
semantic.color.foreground.danger
component.input.color.border.default
```

Avoid:

```text
semantic.color.foreground.red
component.input.color.border.gray
```

A useful naming pattern is:

```text
namespace.category.role.variant.state
```

Examples:

```text
semantic.color.background.default
semantic.color.background.subtle
semantic.color.foreground.default
semantic.color.foreground.muted
semantic.color.border.default
semantic.color.border.focus
component.input.color.background.default
component.input.color.border.default
```

## Source pipeline

The source of truth starts in Figma Variables.

```text
Figma Variables
  -> Figma export snapshots
  -> validated intermediate token graph
  -> Style Dictionary
  -> dist
```

Source snapshots live in:

```text
sources/figma-export-modes
```

Generated output lives in:

```text
dist
```

The build recipe in `src/recipe.mjs` defines the expected collections, modes, theme selectors, and number-to-dimension policy.

Update the recipe only when the Figma source structure intentionally changes.

## Replacing Figma exports

Export modes from the Figma Variables panel and replace the matching snapshot files.

| Figma collection | Figma mode | File                                                     |
| ---------------- | ---------- | -------------------------------------------------------- |
| `primitive`      | `Light`    | `sources/figma-export-modes/primitive/Light.tokens.json` |
| `tokens`         | `Light`    | `sources/figma-export-modes/tokens/Light.tokens.json`    |
| `tokens`         | `Dark`     | `sources/figma-export-modes/tokens/Dark.tokens.json`     |

For local iteration, run:

```sh
npm run dev
```

The watcher rebuilds after each save.

If files are replaced one at a time, temporary validation failures are expected. Aliases or light/dark coverage can be out of sync until the last file is replaced.

After all files are in place, the next rebuild should succeed.

Before committing or publishing, run:

```sh
npm run check
```

## Validation

The build validates the token graph before generating output.

Validation checks that:

- aliases resolve across primitive, semantic, and component tokens
- component tokens do not alias primitive tokens directly
- light and dark modes have matching token coverage
- unresolved references fail the build
- broken values fail the build
- exported files match the expected Figma mode names
- number dimensions follow Figma scopes and recipe path rules
- generated files are rebuilt before tests run

## Development

Install dependencies:

```sh
npm ci
```

Run the full check:

```sh
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

Publishing is handled by GitHub Actions when a GitHub Release is published.

The package is configured for public npm publishing with provenance.

Do not publish manually unless the release process explicitly requires it.

## Making token changes

Before adding or changing a token, check:

- Is this a reusable product need?
- Should this be semantic or component-level instead of primitive?
- Does it work in light and dark mode?
- Does it preserve the existing output contract?
- Does it create a breaking change?
- Does the change need migration notes?

A pull request should include:

- reason for the change
- affected token names
- affected modes
- screenshots or examples if visual behavior changes
- migration notes for renamed, removed, or behavior-changing tokens

## Deprecation policy

Do not remove or rename tokens without a migration path.

When replacing a token:

1. Add the replacement token.
2. Mark the old token as deprecated if supported by the token format.
3. Document the migration.
4. Remove the old token in a future breaking release.

## Versioning

Use semantic versioning.

Use:

- **patch** for fixes that do not change intended UI
- **minor** for new tokens or non-breaking additions
- **major** for renamed, removed, or behavior-changing tokens

Every release should include a changelog entry.

## What not to do

Do not hardcode primitive values in product code.

Do not use primitive tokens as the default product API.

Do not add tokens for one-off designs.

Do not edit `dist` by hand.

Do not rename or remove tokens without a migration path.

Do not use screenshots as the source of truth.

## Support

For usage questions, ask the design system team.

For token changes, open an issue or pull request.
