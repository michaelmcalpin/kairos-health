/**
 * LifeScore (under Insight Sherpa stack) — renders the shared LifeScore view.
 * The primary entry point is now the LifeScore bottom tab; this route is kept
 * for any lingering deep links.
 */

import React from "react";
import LifeScoreView from "@/components/lifescore/LifeScoreView";

export default function LifeScoreInsightsScreen() {
  return <LifeScoreView />;
}
