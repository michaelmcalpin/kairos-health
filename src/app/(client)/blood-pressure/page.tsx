import { redirect } from "next/navigation";

/** Merged into Heart & vitals — old links keep working. */
export default function Page() {
  redirect("/vitals?tab=blood-pressure");
}
