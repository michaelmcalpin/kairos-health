/**
 * Everist LifeScore™ dimension config, shared by the check-in card and the
 * full LifeScore view.
 */

import { HeartPulse, Brain, Compass, Users, Briefcase } from "lucide-react-native";

export type Dimension = "body" | "mind" | "purpose" | "relationships" | "work";

export const DIMENSIONS: {
  key: Dimension; label: string; scope: string; Icon: typeof HeartPulse; color: string;
}[] = [
  { key: "body", label: "Body", scope: "Fitness, sleep, nutrition", Icon: HeartPulse, color: "#5DCAA5" },
  { key: "mind", label: "Mind", scope: "Mental, emotional", Icon: Brain, color: "#8F7FD6" },
  { key: "purpose", label: "Purpose", scope: "Meaning, values", Icon: Compass, color: "#7FB5E0" },
  { key: "relationships", label: "Relationships", scope: "Family, friends, connection", Icon: Users, color: "#E78FB1" },
  { key: "work", label: "Work", scope: "Career, stress, stability", Icon: Briefcase, color: "#E0A24A" },
];
