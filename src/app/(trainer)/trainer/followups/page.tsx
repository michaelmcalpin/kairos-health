import { redirect } from "next/navigation";

// Follow-ups now live in the coach Inbox: messages awaiting a reply and
// session notices.
export default function CoachFollowupsRedirect() {
  redirect("/trainer/inbox?category=messages,sessions");
}
