/**
 * English dictionary — the source of truth for all UI copy. es.ts mirrors this shape.
 * Keep keys stable; add new copy here first. No unsupported health claims (LegitScript).
 */
const en = {
  common: {
    startVisit: "Start a visit",
    shopProducts: "Shop products",
    exploreTelehealth: "Explore telehealth",
    account: "Account",
    cart: "Cart",
    allProducts: "All products",
    readGuides: "Read the guides",
    learnMore: "Learn more",
    explore: "Explore",
    emergency: "In an emergency, call 911.",
  },
  nav: {
    ticker: "Free shipping over $49 · Clinician-informed · HSA/FSA eligible",
    shop: "Shop",
    conditions: "Conditions",
    telehealth: "Telehealth",
    learn: "Learn",
    about: "About",
  },
  home: {
    metaTitle: "Metabolic Health, Thoughtfully Delivered",
    metaDescription:
      "Saludlink pairs clinician-informed weight & metabolic health products with connected telehealth care. Evidence-based, transparently priced, shipped to your door.",
    heroEyebrow: "Weight & Metabolic Health",
    heroTitleLine1: "Metabolic health,",
    heroTitleAccent: "thoughtfully delivered.",
    heroBody:
      "Evidence-informed products and connected telehealth care — chosen with clinicians, priced transparently, and shipped to your door.",
    heroReassurance:
      "HSA/FSA eligible · Free shipping over $49 · 30-day returns",
    trust: {
      a: "Clinician-informed",
      aLabel: "product selection",
      b: "Transparent",
      bLabel: "pricing, always",
      c: "HSA/FSA",
      cLabel: "eligible",
      d: "Free",
      dLabel: "shipping over $49",
    },
    conditionsEyebrow: "Shop by need",
    conditionsTitle: "Find what fits your health goals",
    conditionsBody:
      "Curated products organized around the outcomes that matter for weight and metabolic health.",
    howEyebrow: "How it works",
    howTitle: "A simpler path to metabolic health",
    steps: [
      {
        t: "Choose with confidence",
        d: "Browse products selected with clinical input and described honestly — no hype, no unsupported claims.",
      },
      {
        t: "Connect to care",
        d: "Need guidance? Start a telehealth visit with a licensed provider through our connected care service.",
      },
      {
        t: "Stay on track",
        d: "Subscribe to replenish automatically and monitor progress with at-home tools.",
      },
    ],
    careEyebrow: "Connected care",
    careTitle: "Talk to a licensed provider",
    careBody:
      "Our telehealth service connects you with clinicians for weight and metabolic care. Available in select states — check availability before you begin.",
    careCta2: "How telehealth works",
  },
  conditions: {
    metaTitle: "Health Conditions & Categories",
    metaDescription:
      "Browse Saludlink by health goal — weight management, metabolic health, nutrition, and monitoring. Curated products with connected telehealth care.",
    eyebrow: "Shop by need",
    title: "Health categories",
    body: "Everything we offer is organized around the outcomes that matter for weight and metabolic health.",
    verticals: {
      "weight-management": {
        label: "Weight Management",
        blurb: "Evidence-informed support for sustainable weight change.",
      },
      "metabolic-health": {
        label: "Metabolic Health",
        blurb: "Blood sugar, energy, and metabolic markers.",
      },
      nutrition: {
        label: "Nutrition & Meal Support",
        blurb: "Protein, fiber, and daily nutritional foundations.",
      },
      monitoring: {
        label: "Monitoring & Devices",
        blurb: "Scales, monitors, and at-home tracking tools.",
      },
    },
  },
  telemedicine: {
    metaTitle: "Telehealth for Weight & Metabolic Health",
    metaDescription:
      "Connect with licensed providers for weight and metabolic care through Saludlink's telehealth service. See how it works and check state availability.",
    heroTitle: "Licensed telehealth for weight & metabolic health",
    heroBody:
      "Meet with clinicians who focus on metabolic health, from home. Care is delivered through our secure telehealth service and available in select states.",
    checkAvailability: "Check state availability",
    howTitle: "How it works",
    steps: [
      {
        t: "Check availability",
        d: "Confirm telehealth is offered in your state.",
      },
      {
        t: "Start your visit",
        d: "Create an account and complete a short intake in the telehealth app.",
      },
      {
        t: "Meet your provider",
        d: "Connect by secure video with a licensed clinician.",
      },
      {
        t: "Follow your plan",
        d: "Get guidance and, where appropriate, order supporting products.",
      },
    ],
    availabilityTitle: "Where telehealth is available",
    availabilityBody:
      "Telehealth services are offered only in states where our providers are licensed. This list is updated as we expand.",
    faqTitle: "Frequently asked questions",
    faqs: [
      {
        question: "How does a Saludlink telehealth visit work?",
        answer:
          "You start a visit through our connected telehealth service, complete a brief intake, and meet with a licensed provider by secure video. If care is appropriate, the provider will discuss next steps with you.",
      },
      {
        question: "Which states is telehealth available in?",
        answer:
          "Telehealth is available only in states where our providers are licensed. See the state availability table on this page for the current list.",
      },
      {
        question: "Is this a substitute for emergency care?",
        answer:
          "No. Telehealth is not for emergencies. If you have a medical emergency, call 911 or go to the nearest emergency room.",
      },
      {
        question: "Do I need insurance?",
        answer:
          "No. Visits can be paid out of pocket, and many are HSA/FSA eligible. Coverage details are shown before you begin.",
      },
    ],
  },
  availability: {
    state: "State",
    telehealth: "Telehealth",
    shipping: "Product shipping",
    available: "Available",
    notYet: "Not yet",
  },
  footer: {
    shop: "Shop",
    company: "Company",
    legal: "Legal",
    contact: "Contact",
    certificationPending: "Certification pending",
    disclaimer:
      "The information provided by Saludlink is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Statements regarding dietary supplements have not been evaluated by the FDA and are not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare provider. In an emergency, call 911.",
    rights: "All rights reserved.",
    statesNote: "Services available only in listed states —",
    seeAvailability: "see state availability",
  },
  about: {
    metaTitle: "About Saludlink",
    metaDescription:
      "Saludlink brings together clinician-informed health products and connected telehealth care for weight and metabolic health — transparently and honestly.",
    eyebrow: "Our mission",
    title: "Health, made honest and accessible",
    intro:
      "Saludlink exists to make weight and metabolic health simpler to manage. We pair carefully selected products with connected telehealth care, and we describe everything we sell honestly — no hype, no unsupported claims.",
    believeTitle: "What we believe",
    beliefs: [
      {
        t: "Transparency first.",
        d: "Clear pricing, clear sourcing, and clear information about what a product does and does not do.",
      },
      {
        t: "Clinician-informed.",
        d: "Our catalog is shaped with clinical input, and care is delivered by licensed providers.",
      },
      {
        t: "Privacy by design.",
        d: "We keep your health data protected and hold clinical records separate from our store.",
      },
    ],
    whoTitle: "Who we are",
    whoBody:
      "Saludlink, Inc. is a health and wellness company. Leadership and ownership details will be listed here for full transparency.",
  },
  contact: {
    metaTitle: "Contact Us",
    metaDescription:
      "Reach the Saludlink team for support, questions about your order, or accessibility and privacy requests.",
    eyebrow: "We're here to help",
    title: "Contact Saludlink",
    intro:
      "For medical emergencies, call 911. Our support team is here for everything else.",
    supportTitle: "Customer support",
    supportBody: "Orders, products, returns.",
    addressTitle: "Mailing address",
    privacyNote: "Privacy requests:",
    accessibilityNote: "Accessibility:",
  },
  licensing: {
    metaTitle: "Licensing & State Availability",
    metaDescription:
      "Where Saludlink telehealth and product shipping are available, and information about our licensing and medical oversight.",
    eyebrow: "Transparency",
    title: "Licensing & state availability",
    intro:
      "Saludlink, Inc. provides health and wellness products nationwide where shipping is available, and telehealth services only in states where our affiliated providers are licensed. The table below shows current availability. We update it as we expand.",
    oversightTitle: "Medical oversight",
    oversightBody:
      "Telehealth care is delivered by licensed clinicians through our connected telehealth service. Provider licensing information is available on request.",
    businessTitle: "Business information",
    draftNote:
      "This page contains placeholder details pending final compliance review. Not for emergencies — call 911 in an emergency.",
  },
} as const

export default en
export type Dictionary = typeof en
