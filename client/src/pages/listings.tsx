import { ListingTable } from "@/components/listings/listing-table";
import { ListingForm } from "@/components/listings/listing-form";

export default function Listings() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Listings</h2>
          <p className="text-sm text-gray-600">
            Manage and track all broker listings
          </p>
        </div>
        <ListingForm />
      </div>

      <ListingTable />
    </div>
  );
}
