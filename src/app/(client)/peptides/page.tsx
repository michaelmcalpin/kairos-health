import { redirect } from "next/navigation";

/** Merged into Protocol — old links keep working. */
export default function Page() {
  redirect("/protocol?tab=peptides");
}
