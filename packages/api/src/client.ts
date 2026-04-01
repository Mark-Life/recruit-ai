import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Effect, Layer } from "effect";
import { AppRpcs } from "./rpc";

/** Create an RPC client backed by HTTP + JSON. Requires a Scope to stay alive. */
export const makeClient = (baseUrl: string) => {
  const ProtocolLayer = RpcClient.layerProtocolHttp({
    url: `${baseUrl}/api/rpc`,
  }).pipe(
    Layer.provide(RpcSerialization.layerNdjson),
    Layer.provide(FetchHttpClient.layer)
  );

  return RpcClient.make(AppRpcs).pipe(Effect.provide(ProtocolLayer));
};
