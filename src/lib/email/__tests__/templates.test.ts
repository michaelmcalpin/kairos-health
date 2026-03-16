import { describe, it, expect } from "vitest";
import {
  wrapEmailLayout,
  emailHeading,
  emailParagraph,
  emailButton,
  emailMetricTable,
  emailInfoBox,
  buildWelcomeEmail,
  buildWeeklyReportEmail,
  buildAlertEmail,
  buildCoachMessageEmail,
} from "../templates";

describe("Email layout", () => {
  it("wraps content in valid HTML structure", () => {
    const html = wrapEmailLayout("<p>Hello</p>");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("KAIROS");
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("</html>");
  });

  it("includes preheader when provided", () => {
    const html = wrapEmailLayout("<p>Test</p>", { preheader: "Quick preview" });
    expect(html).toContain("Quick preview");
    expect(html).toContain("display: none");
  });
});

describe("Email building blocks", () => {
  it("creates heading with correct styling", () => {
    const heading = emailHeading("Test Title");
    expect(heading).toContain("Test Title");
    expect(heading).toContain("h1");
    expect(heading).toContain("Montserrat");
  });

  it("creates paragraph", () => {
    const p = emailParagraph("Body text here");
    expect(p).toContain("Body text here");
    expect(p).toContain("<p");
  });

  it("creates button with URL", () => {
    const btn = emailButton("Click Me", "https://example.com");
    expect(btn).toContain("Click Me");
    expect(btn).toContain("https://example.com");
    expect(btn).toContain("#D4AF37"); // Gold background
  });

  it("creates metric table", () => {
    const table = emailMetricTable([
      { label: "Score", value: "85/100", color: "#10b981" },
      { label: "Change", value: "+5 pts" },
    ]);
    expect(table).toContain("Score");
    expect(table).toContain("85/100");
    expect(table).toContain("#10b981");
  });

  it("creates info box", () => {
    const box = emailInfoBox("Important message here");
    expect(box).toContain("Important message here");
    expect(box).toContain("border-radius");
  });

  it("escapes HTML in content", () => {
    const heading = emailHeading('Test <script>alert("xss")</script>');
    expect(heading).not.toContain("<script>");
    expect(heading).toContain("&lt;script&gt;");
  });
});

describe("Pre-built email templates", () => {
  it("builds welcome email", () => {
    const html = buildWelcomeEmail("Michael");
    expect(html).toContain("Welcome to KAIROS, Michael");
    expect(html).toContain("/onboarding");
    expect(html).toContain("Complete Your Profile");
  });

  it("builds weekly report email", () => {
    const html = buildWeeklyReportEmail({
      name: "Michael",
      score: 82,
      change: 5,
      wins: ["Great glucose control", "Sleep improved"],
      focusAreas: ["Increase protein intake"],
    });
    expect(html).toContain("Weekly Health Report");
    expect(html).toContain("82/100");
    expect(html).toContain("+5 pts");
    expect(html).toContain("Great glucose control");
    expect(html).toContain("Increase protein intake");
  });

  it("builds alert email", () => {
    const html = buildAlertEmail({
      name: "Michael",
      alertTitle: "High Glucose",
      alertBody: "Glucose at 185 mg/dL",
      actionUrl: "/glucose",
      actionLabel: "View Glucose",
      severity: "high",
    });
    expect(html).toContain("High Glucose");
    expect(html).toContain("185 mg/dL");
    expect(html).toContain("HIGH");
  });

  it("builds coach message email", () => {
    const html = buildCoachMessageEmail({
      clientName: "Michael",
      coachName: "Dr. Smith",
      preview: "Great progress this week!",
    });
    expect(html).toContain("Dr. Smith");
    expect(html).toContain("Great progress this week!");
    expect(html).toContain("/messages");
  });
});
