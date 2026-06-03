import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/user";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type Props = { children: ReactNode };

export default async function SosLayout({ children }: Props) {
  const user = await getAuthUser();
  if (!user) redirect(AUTH_ROUTES.login);
  return <>{children}</>;
}
