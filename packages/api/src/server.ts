import { HttpServer } from "@effect/platform";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { GeminiEmbeddingLive, GeminiLlmLive } from "@workspace/ai/layers";
import { JobOrchestrationService } from "@workspace/core/services/job-orchestration-service";
import { JobQueryService } from "@workspace/core/services/job-query-service";
import { ProfileIngestionService } from "@workspace/core/services/profile-ingestion-service";
import { RankingService } from "@workspace/core/services/ranking-service";
import { TalentOrchestrationService } from "@workspace/core/services/talent-orchestration-service";
import { TalentQueryService } from "@workspace/core/services/talent-query-service";
import { JobDescriptionRepositoryPostgresLayer } from "@workspace/db/adapters/job-description-repository-postgres";
import { RecruiterRepositoryPostgresLayer } from "@workspace/db/adapters/recruiter-repository-postgres";
import { TalentRepositoryPostgresLayer } from "@workspace/db/adapters/talent-repository-postgres";
import { DrizzleClient } from "@workspace/db/client";
import { DatabaseConfig } from "@workspace/db/config";
import { VectorSearchQdrantLayer } from "@workspace/vector/adapters/vector-search-qdrant";
import { QdrantClientService } from "@workspace/vector/client";
import { QdrantConfig } from "@workspace/vector/config";
import { Layer, Redacted } from "effect";
import { AppRpcsLive } from "./handlers/rpc-handlers";
import { AppRpcs } from "./rpc";

// ---------------------------------------------------------------------------
// DB adapter layers (all depend on DrizzleClient)
// ---------------------------------------------------------------------------

const DbLayer = Layer.mergeAll(
  JobDescriptionRepositoryPostgresLayer,
  TalentRepositoryPostgresLayer,
  RecruiterRepositoryPostgresLayer
).pipe(Layer.provide(DrizzleClient.layer), Layer.provide(DatabaseConfig.layer));

// ---------------------------------------------------------------------------
// Vector search layer (Qdrant)
// ---------------------------------------------------------------------------

const VectorLayer = VectorSearchQdrantLayer.pipe(
  Layer.provide(QdrantClientService.layer),
  Layer.provide(
    Layer.succeed(QdrantConfig, {
      url: process.env.QDRANT_URL ?? "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY
        ? Redacted.make(process.env.QDRANT_API_KEY)
        : undefined,
    })
  )
);

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
).pipe(
  Layer.provide(DbLayer),
  Layer.provide(VectorLayer),
  Layer.provide(AiLayer)
);

const QueryServiceLayer = Layer.mergeAll(
  JobQueryService.layer,
  TalentQueryService.layer
).pipe(Layer.provide(BaseServiceLayer), Layer.provide(DbLayer));

const OrchestrationServiceLayer = Layer.mergeAll(
  JobOrchestrationService.layer,
  TalentOrchestrationService.layer
).pipe(
  Layer.provide(BaseServiceLayer),
  Layer.provide(DbLayer),
  Layer.provide(VectorLayer),
  Layer.provide(AiLayer)
);

const ServiceLayer = Layer.mergeAll(
  QueryServiceLayer,
  OrchestrationServiceLayer
);

// ---------------------------------------------------------------------------
// RPC server
// ---------------------------------------------------------------------------

const RpcLive = Layer.mergeAll(
  AppRpcsLive.pipe(Layer.provide(ServiceLayer)),
  RpcSerialization.layerNdjson,
  HttpServer.layerContext
);

export const createWebHandler = () =>
  RpcServer.toWebHandler(AppRpcs, { layer: RpcLive });
