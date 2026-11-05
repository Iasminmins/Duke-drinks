import { RoleGuard } from "@/components/layout/role-guard";
import { GarcomShell } from "@/components/garcom/garcom-shell";

export const metadata = { title: "Garçom" };

export default function GarcomLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard papeis={["garcom"]}>
      <GarcomShell>{children}</GarcomShell>
    </RoleGuard>
  );
}
