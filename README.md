# Maria Design Tokens

This package is the versioned design contract between Figma and web code.

Figma Variables are the source of truth. This package publishes only resolved
web CSS custom properties and JSON for tooling. It does not contain component
code, component documentation, or application styles.

## Consumer contract

| Entry point | Purpose |
| --- | --- |
| `@maria-ms/tokens/css/light` | Light-theme CSS custom properties |
| `@maria-ms/tokens/css/dark` | Dark-theme CSS custom properties |
| `@maria-ms/tokens/json/light` | Resolved light-theme values for tooling |
| `@maria-ms/tokens/json/dark` | Resolved dark-theme values for tooling |

The package root is intentionally not importable.

### Web use

Import both theme files once at the application or component-library boundary.

```ts
import "@maria-ms/tokens/css/light";
import "@maria-ms/tokens/css/dark";
```

Light tokens apply to `:root` and `[data-theme="light"]`. Dark tokens apply to
`[data-theme="dark"]`.

```css
:host {
  background: var(--ds-semantic-color-background-default);
  color: var(--ds-semantic-color-foreground-default);
}
```

Use semantic tokens by default. Use component tokens when a component has a
deliberate, stable visual contract. Do not use primitive tokens in product UI
unless creating a new semantic or component token.

## Source and build

```text
Figma Variables
  → committed Export Modes snapshots
  → validate
  → normalize to DTCG in memory
  → dist/css and dist/json
```

The committed snapshots are replaced directly from Figma Export Modes:

| Figma collection | Figma mode | Snapshot |
| --- | --- | --- |
| `primitive` | `Light` | `sources/figma-export-modes/primitive/Light.tokens.json` |
| `tokens` | `Light` | `sources/figma-export-modes/tokens/Light.tokens.json` |
| `tokens` | `Dark` | `sources/figma-export-modes/tokens/Dark.tokens.json` |

Run the complete production check after replacing all three snapshots:

```sh
npm run check
```

The build fails when a source mode is wrong, aliases cannot resolve, light and
dark coverage differs, scopes are missing or broad, unsupported values appear,
or generated output names collide. A failed build keeps the previous `dist`
directory intact.

## Rules

- `primitive` holds raw values.
- `semantic` expresses product intent.
- `component` captures stable, component-specific decisions.
- Component tokens must not alias primitives directly; use semantic tokens.
- A rename or removal is a breaking change. Coordinate consumers before release.
- Never edit `dist` by hand.

## Commands

| Command | Result |
| --- | --- |
| `npm run build` | Validates Figma snapshots and replaces `dist` on success |
| `npm run test` | Runs source, output, and package-contract tests |
| `npm run check` | Builds and tests the publishable package |
| `npm run dev` | Watches snapshots and source files, then rebuilds |
