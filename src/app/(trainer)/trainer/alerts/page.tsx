import { redirect } from "next/navigation";

// Alerts now live in the coach Inbox (health items).
export default function CoachAlertsRedirect() {
  redirect("/trainer/inbox?category=health");
}
