export class RouteChunkLoadError extends Error {
  constructor(cause: unknown) {
    super("A route page could not be loaded.", { cause });
    this.name = "RouteChunkLoadError";
  }
}
