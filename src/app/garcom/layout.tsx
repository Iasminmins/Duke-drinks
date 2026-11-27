import { RoleGuard } from "@/components/layout/role-guard";
import { GarcomLayoutShell } from "@/components/garcom/garcom-layout-shell";

export const metadata = { title: "Garçom" };

export default function GarcomLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard papeis={["garcom"]}>
      <GarcomLayoutShell>{children}</GarcomLayoutShell>
    </RoleGuard>
  );
}
