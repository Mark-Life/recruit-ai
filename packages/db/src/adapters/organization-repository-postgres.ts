import { Organization } from "@workspace/core/domain/models/organization";
import { OrganizationRepository } from "@workspace/core/ports/organization-repository";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { DrizzleClient } from "../client";
import { organizations } from "../schema/organizations";

type OrgRow = typeof organizations.$inferSelect;

const decodeOrganization = Schema.decodeUnknownSync(Organization);
const toDomain = (row: OrgRow): Organization => decodeOrganization(row);

export const OrganizationRepositoryPostgresLayer = Layer.effect(
  OrganizationRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleClient;

    return OrganizationRepository.of({
      findById: (id) =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() =>
            db.select().from(organizations).where(eq(organizations.id, id))
          );
          const row = rows[0];
          if (!row) {
            return yield* Effect.die(`Organization not found: ${id}`);
          }
          return toDomain(row);
        }),
    });
  })
);
