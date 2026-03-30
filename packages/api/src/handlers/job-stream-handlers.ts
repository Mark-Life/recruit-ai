import {
  HttpApiBuilder,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { JobDescriptionId } from "@workspace/core/domain/models/ids";
import { JobOrchestrationService } from "@workspace/core/services/job-orchestration-service";
import { Effect, Schema, Stream } from "effect";

const decodeJobId = Schema.decodeSync(JobDescriptionId);

const SubmitAnswersBody = Schema.Struct({
  answers: Schema.Array(
    Schema.Struct({
      field: Schema.String,
      answer: Schema.String,
    })
  ),
});

const toNdjsonStream = <E>(
  source: Stream.Stream<unknown, E>
): Stream.Stream<Uint8Array, E> =>
  source.pipe(
    Stream.map((chunk) =>
      new TextEncoder().encode(`${JSON.stringify(chunk)}\n`)
    )
  );

export const JobStreamRoutesLive = HttpApiBuilder.Router.use((router) =>
  Effect.gen(function* () {
    const orchestration = yield* JobOrchestrationService;

    yield* router.post(
      "/api/jobs/:id/extract",
      Effect.gen(function* () {
        const { id } = yield* HttpRouter.params;

        const stream = orchestration.extractJob(decodeJobId(id ?? ""));

        return HttpServerResponse.stream(toNdjsonStream(stream), {
          contentType: "text/x-ndjson",
        });
      }).pipe(Effect.orDie)
    );

    yield* router.post(
      "/api/jobs/:id/answers",
      Effect.gen(function* () {
        const { id } = yield* HttpRouter.params;
        const body = yield* HttpServerRequest.schemaBodyJson(SubmitAnswersBody);

        const stream = orchestration.submitAnswers(
          decodeJobId(id ?? ""),
          body.answers
        );

        return HttpServerResponse.stream(toNdjsonStream(stream), {
          contentType: "text/x-ndjson",
        });
      }).pipe(Effect.orDie)
    );
  })
);
