import { Schema } from "effect";
import { OrganizationId } from "./ids";

export class Organization extends Schema.Class<Organization>("Organization")({
  id: OrganizationId,
  name: Schema.String,
  industry: Schema.String,
}) {}
