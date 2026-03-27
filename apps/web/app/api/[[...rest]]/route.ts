import { createWebHandler } from "@workspace/api/server";

const { handler } = createWebHandler();

// Effect's toWebHandler returns (request: Request) => Promise<Response>,
// but Next.js typed routes expect a second `context` param. Cast to satisfy both.
const routeHandler = handler as (request: Request) => Promise<Response>;

export const GET = routeHandler;
export const POST = routeHandler;
export const PUT = routeHandler;
export const PATCH = routeHandler;
export const DELETE = routeHandler;
