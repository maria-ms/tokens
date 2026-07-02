export const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const tokenName = (token) => token.path.join("/");

export const isReference = (value) =>
  typeof value === "string" && /^\{[^{}]+\}$/.test(value);
