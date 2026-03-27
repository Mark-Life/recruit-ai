import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

export default async function RefinePage({ params }: { params: Params }) {
  const { id } = await params;
  redirect(`/jobs/${id}`);
}
