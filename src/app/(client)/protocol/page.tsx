"use client";

import { TabbedPage } from "@/components/client/TabbedPage";
import SupplementsView from "@/components/client/views/SupplementsView";
import MedicationsView from "@/components/client/views/MedicationsView";
import PeptidesView from "@/components/client/views/PeptidesView";

export default function ProtocolPage() {
  return (
    <TabbedPage
      title="Protocol"
      blurb="Your supplements, medications and peptides, as kept by you and your care team."
      tabs={[
        { key: "supplements", label: "Supplements", render: () => <SupplementsView /> },
        { key: "medications", label: "Medications", render: () => <MedicationsView /> },
        { key: "peptides", label: "Peptides", render: () => <PeptidesView /> },
      ]}
    />
  );
}
