import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

const RefinePage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  redirect(`/jobs/${id}`);
};

export default RefinePage;
