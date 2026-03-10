"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HREmployees() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/users");
  }, [router]);

  return null;
}
