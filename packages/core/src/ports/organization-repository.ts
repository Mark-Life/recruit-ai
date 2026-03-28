import { Context, type Effect } from "effect";
import type { OrganizationNotFoundError } from "../domain/errors";
import type { OrganizationId } from "../domain/models/ids";
import type { Organization } from "../domain/models/organization";

export class OrganizationRepository extends Context.Tag(
  "@recruit/OrganizationRepository"
)<
  OrganizationRepository,
  {
    readonly findById: (
      id: OrganizationId
    ) => Effect.Effect<Organization, OrganizationNotFoundError>;
  }
>() {}
