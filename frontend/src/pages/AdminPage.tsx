import { AdminLoginGate } from "../components/AdminLoginGate";
import { AdminSubmissionsTable } from "../components/AdminSubmissionsTable";

export function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <AdminLoginGate>{(password) => <AdminSubmissionsTable password={password} />}</AdminLoginGate>
    </div>
  );
}
