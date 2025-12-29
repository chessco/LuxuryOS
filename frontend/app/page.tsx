"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Basic auth check simulation
    const token = localStorage.getItem("token");
    if (!token && pathname !== "/login") {
      router.push("/login");
    } else if (token && (pathname === "/" || pathname === "/login")) {
      router.push("/dashboard");
    }
  }, [router, pathname]);

  return null;
}
