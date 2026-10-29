import { redirect } from "next/navigation";

export default function Page() {
  redirect("/app/stock?tab=suppliers");
}
