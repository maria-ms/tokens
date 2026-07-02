/** Run build stages left-to-right, passing each resolved result to the next stage. */
export const runPipeline =
  (...steps) =>
  (context) =>
    steps.reduce(
      async (value, step) => step(await value),
      Promise.resolve(context),
    );
