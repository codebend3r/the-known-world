import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";

export default function NotFound() {
  return (
    <ParchmentLayout>
      <PageHeading
        title="Not found"
        subtitle="No such place in the chronicles."
      />
    </ParchmentLayout>
  );
}
