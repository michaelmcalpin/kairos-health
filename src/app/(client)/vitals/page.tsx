"use client";

import { TabbedPage } from "@/components/client/TabbedPage";
import BloodPressureView from "@/components/client/views/BloodPressureView";
import GlucoseView from "@/components/client/views/GlucoseView";

export default function VitalsPage() {
  return (
    <TabbedPage
      title="Heart & vitals"
      blurb="Blood pressure and blood sugar, from your devices and your own readings."
      tabs={[
        { key: "blood-pressure", label: "Blood pressure", render: () => <BloodPressureView /> },
        { key: "glucose", label: "Glucose", render: () => <GlucoseView /> },
      ]}
    />
  );
}
