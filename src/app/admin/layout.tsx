"use client";

import { RoleGuard } from "@/components/layout/role-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard papeis={["admin"]}>
      {children}
    </RoleGuard>
  );
}
