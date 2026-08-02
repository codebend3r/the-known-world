import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";

export default function NotFound() {
  return (
    <PlateLayout>
      <PageHeading
        title="Not found"
        subtitle="No such place in the chronicles."
      />
    </PlateLayout>
  );
}
