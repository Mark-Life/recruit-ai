import {
  HttpApiBuilder,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import type { RecruiterId } from "@workspace/core/domain/models/ids";
import { TalentOrchestrationService } from "@workspace/core/services/talent-orchestration-service";
import { Effect, Schema, Stream } from "effect";

const CreateTalentBody = Schema.Struct({
  name: Schema.String,
  resumeText: Schema.optional(Schema.String),
  resumePdfBase64: Schema.optional(Schema.String),
  recruiterId: Schema.String,
});

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
      "/api/talents",
      Effect.gen(function* () {
        const body = yield* HttpServerRequest.schemaBodyJson(CreateTalentBody);

        const recruiterId = body.recruiterId as RecruiterId;

        const stream = body.resumePdfBase64
          ? orchestration.createFromPdf({
              name: body.name,
              pdfBase64: body.resumePdfBase64,
              recruiterId,
            })
          : orchestration.createFromText({
              name: body.name,
              resumeText: body.resumeText ?? "",
              recruiterId,
            });

        return HttpServerResponse.stream(toNdjsonStream(stream), {
          contentType: "text/x-ndjson",
        });
      }).pipe(Effect.orDie)
    );
  })
);
