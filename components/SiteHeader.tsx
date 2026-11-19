import { auth } from "@clerk/nextjs/server";
import PublicNav from "./PublicNav";
import SiteNav from "./SiteNav";
export default async function SiteHeader() {
  const { userId } = await auth();
  return userId ? <SiteNav /> : <PublicNav />;
}
