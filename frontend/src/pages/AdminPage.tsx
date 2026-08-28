import { AdminLoginGate } from "../components/AdminLoginGate";
import { AdminSubmissionsTable } from "../components/AdminSubmissionsTable";

export function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminLoginGate>{(password) => <AdminSubmissionsTable password={password} />}</AdminLoginGate>
    </div>
  );
}
