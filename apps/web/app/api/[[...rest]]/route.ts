import { createWebHandler } from "@workspace/api/server";

const { handler } = createWebHandler();

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
