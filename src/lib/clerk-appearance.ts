/**
 * Shared Clerk appearance config for all Everist.ai auth pages.
 *
 * The card is dark (kairos theme), so every Clerk element that defaults
 * to light-theme styling must be overridden — especially the social
 * SSO buttons (Google, LinkedIn), which otherwise render dark text on
 * the dark card with no contrast.
 */

export const kairosClerkAppearance = {
  elements: {
    rootBox: "mx-auto",
    card: "bg-kairos-card border border-kairos-border shadow-kairos",
    headerTitle: "text-white font-heading",
    headerSubtitle: "text-kairos-silver-dark",
    formButtonPrimary:
      "bg-kairos-gold hover:bg-kairos-gold-light text-kairos-royal-dark font-heading font-semibold",
    formFieldInput: "bg-kairos-input border-kairos-border text-white",
    formFieldLabel: "text-kairos-silver",
    footerActionLink: "text-kairos-gold hover:text-kairos-gold-light",
    footerActionText: "text-kairos-silver-dark",

    // Social SSO buttons — white background so provider logos and
    // labels (designed for light surfaces) are clearly readable
    socialButtonsBlockButton:
      "bg-white hover:bg-gray-100 border border-gray-300 !text-gray-900",
    socialButtonsBlockButtonText: "!text-gray-900 font-medium",
    socialButtonsProviderIcon: "opacity-100",

    // Divider between SSO and email form
    dividerLine: "bg-kairos-border",
    dividerText: "text-kairos-silver-dark",

    // Misc dark-theme fixes
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-kairos-gold",
    formFieldAction: "text-kairos-gold hover:text-kairos-gold-light",
    otpCodeFieldInput: "bg-kairos-input border-kairos-border text-white",
    formResendCodeLink: "text-kairos-gold",
    alternativeMethodsBlockButton:
      "bg-kairos-input border-kairos-border text-white hover:bg-kairos-card",
  },
} as const;
