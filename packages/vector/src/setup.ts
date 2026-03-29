import { QdrantClient } from "@qdrant/js-client-rest";
import { EMBEDDING_DIMENSIONS } from "@workspace/core/domain/models/vector";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";

/** Bootstrap Qdrant collections and payload indexes. Idempotent. */
async function setup() {
  const client = new QdrantClient({ url: QDRANT_URL });

  for (const name of ["talents", "jobs"] as const) {
    const exists = await client.collectionExists(name);
    if (exists.exists) {
      console.log(`Collection already exists: ${name}`);
    } else {
      await client.createCollection(name, {
        vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
      });
      console.log(`Created collection: ${name}`);
    }
  }

  // Talent payload indexes
  await client.createPayloadIndex("talents", {
    field_name: "keywords",
    field_schema: "keyword",
  });
  await client.createPayloadIndex("talents", {
    field_name: "workModes",
    field_schema: "keyword",
  });
  await client.createPayloadIndex("talents", {
    field_name: "location",
    field_schema: "keyword",
  });
  await client.createPayloadIndex("talents", {
    field_name: "experienceYears",
    field_schema: "integer",
  });
  await client.createPayloadIndex("talents", {
    field_name: "status",
    field_schema: "keyword",
  });
  await client.createPayloadIndex("talents", {
    field_name: "willingToRelocate",
    field_schema: "bool",
  });

  // Job payload indexes
  await client.createPayloadIndex("jobs", {
    field_name: "keywords",
    field_schema: "keyword",
  });
  await client.createPayloadIndex("jobs", {
    field_name: "workMode",
    field_schema: "keyword",
  });
  await client.createPayloadIndex("jobs", {
    field_name: "location",
    field_schema: "keyword",
  });
  await client.createPayloadIndex("jobs", {
    field_name: "status",
    field_schema: "keyword",
  });

  console.log("Qdrant setup complete.");
}

setup().catch(console.error);
