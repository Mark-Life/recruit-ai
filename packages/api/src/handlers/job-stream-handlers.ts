import {
  HttpApiBuilder,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import type {
  JobDescriptionId,
  OrganizationId,
} from "@workspace/core/domain/models/ids";
import { JobOrchestrationService } from "@workspace/core/services/job-orchestration-service";
import { Effect, Schema, Stream } from "effect";

const CreateJobBody = Schema.Struct({
  rawText: Schema.String,
  title: Schema.String,
  organizationId: Schema.String,
});

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
      "/api/jobs",
      Effect.gen(function* () {
        const body = yield* HttpServerRequest.schemaBodyJson(CreateJobBody);

        const stream = orchestration.createJob({
          rawText: body.rawText,
          title: body.title,
          organizationId: body.organizationId as OrganizationId,
        });

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
          id as JobDescriptionId,
          body.answers
        );

        return HttpServerResponse.stream(toNdjsonStream(stream), {
          contentType: "text/x-ndjson",
        });
      }).pipe(Effect.orDie)
    );
  })
);
