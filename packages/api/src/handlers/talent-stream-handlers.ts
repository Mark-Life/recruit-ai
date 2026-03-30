import {
  HttpApiBuilder,
  HttpRouter,
  HttpServerResponse,
} from "@effect/platform";
import { TalentId } from "@workspace/core/domain/models/ids";
import { TalentOrchestrationService } from "@workspace/core/services/talent-orchestration-service";
import { Effect, Schema, Stream } from "effect";

const decodeTalentId = Schema.decodeSync(TalentId);

const toNdjsonStream = <E>(
  source: Stream.Stream<unknown, E>
): Stream.Stream<Uint8Array, E> =>
  source.pipe(
    Stream.map((chunk) =>
      new TextEncoder().encode(`${JSON.stringify(chunk)}\n`)
    )
  );

export const TalentStreamRoutesLive = HttpApiBuilder.Router.use((router) =>
  Effect.gen(function* () {
    const orchestration = yield* TalentOrchestrationService;

    yield* router.post(
      "/api/talents/:id/extract",
      Effect.gen(function* () {
        const { id } = yield* HttpRouter.params;

        const stream = orchestration.extractTalent(decodeTalentId(id ?? ""));

        return HttpServerResponse.stream(toNdjsonStream(stream), {
          contentType: "text/x-ndjson",
        });
      }).pipe(Effect.orDie)
    );
  })
);
