import { HttpApiBuilder, HttpServer } from "@effect/platform";
import { GeminiEmbeddingLive, GeminiLlmLive } from "@workspace/ai/layers";
import { JobOrchestrationService } from "@workspace/core/services/job-orchestration-service";
import { ProfileIngestionService } from "@workspace/core/services/profile-ingestion-service";
import { RankingService } from "@workspace/core/services/ranking-service";
import { TalentOrchestrationService } from "@workspace/core/services/talent-orchestration-service";
import { JobDescriptionRepositoryPostgresLayer } from "@workspace/db/adapters/job-description-repository-postgres";
import { MatchRepositoryPostgresLayer } from "@workspace/db/adapters/match-repository-postgres";
import { RecruiterRepositoryPostgresLayer } from "@workspace/db/adapters/recruiter-repository-postgres";
import { TalentRepositoryPostgresLayer } from "@workspace/db/adapters/talent-repository-postgres";
import { VectorSearchPostgresLayer } from "@workspace/db/adapters/vector-search-postgres";
import { DrizzleClient } from "@workspace/db/client";
import { DatabaseConfig } from "@workspace/db/config";
import { Layer } from "effect";
import { AppApi } from "./api";
import { HealthGroupLive } from "./handlers/health-handlers";
import { JobsGroupLive } from "./handlers/job-handlers";
import { JobStreamRoutesLive } from "./handlers/job-stream-handlers";
import { TalentsGroupLive } from "./handlers/talent-handlers";
import { TalentStreamRoutesLive } from "./handlers/talent-stream-handlers";

// ---------------------------------------------------------------------------
// DB adapter layers (all depend on DrizzleClient)
// ---------------------------------------------------------------------------

const DbLayer = Layer.mergeAll(
  JobDescriptionRepositoryPostgresLayer,
  TalentRepositoryPostgresLayer,
  MatchRepositoryPostgresLayer,
  VectorSearchPostgresLayer,
  RecruiterRepositoryPostgresLayer
).pipe(Layer.provide(DrizzleClient.layer), Layer.provide(DatabaseConfig.layer));

// ---------------------------------------------------------------------------
// AI adapter layers
// ---------------------------------------------------------------------------

const AiLayer = Layer.merge(GeminiLlmLive, GeminiEmbeddingLive);

// ---------------------------------------------------------------------------
// Core service layers
// ---------------------------------------------------------------------------

const BaseServiceLayer = Layer.mergeAll(
  RankingService.layer,
  ProfileIngestionService.layer
).pipe(Layer.provide(DbLayer), Layer.provide(AiLayer));

const ServiceLayer = Layer.mergeAll(
  JobOrchestrationService.layer,
  TalentOrchestrationService.layer
).pipe(
  Layer.provide(BaseServiceLayer),
  Layer.provide(DbLayer),
  Layer.provide(AiLayer)
);

// ---------------------------------------------------------------------------
// API composition
// ---------------------------------------------------------------------------

const AppApiLive = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(HealthGroupLive),
  Layer.provide(JobsGroupLive),
  Layer.provide(TalentsGroupLive),
  Layer.provide(JobStreamRoutesLive),
  Layer.provide(TalentStreamRoutesLive),
  Layer.provide(ServiceLayer),
  Layer.provide(DbLayer)
);

export const createWebHandler = () =>
  HttpApiBuilder.toWebHandler(
    Layer.mergeAll(AppApiLive, HttpServer.layerContext)
  );
