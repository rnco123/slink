import { ExecArgs } from "@medusajs/framework/types"
import { CONTENT_MODULE } from "../modules/content"
import ContentModuleService from "../modules/content/service"

/**
 * Seeds the Saludlink mini-CMS: the 10 legal/policy pages (EN + ES), a sample health
 * article, and site settings (contact, telemedicine link, state availability).
 * Run: npx medusa exec ./src/scripts/seed-content.ts
 * Idempotent — skips rows that already exist for a (slug, locale) / setting key.
 */

// Draft-review notice prepended to every legal body (EN/ES). The live legal
// route (`legal/[slug]/page.tsx`) renders the CMS body directly and does NOT use
// LegalLayout, so this is how the "pending counsel" notice reaches the page.
// Task 40 (counsel review) stays open — do NOT claim these are final terms.
const DRAFT_EN =
  "Draft for review — pending counsel. This document describes Saludlink's current practices and is not yet final. It is pending review by qualified legal counsel and may change before it takes effect."
const DRAFT_ES =
  "Borrador para revisión — pendiente de asesoría legal. Este documento describe las prácticas actuales de Saludlink y aún no es definitivo. Está pendiente de revisión por asesoría legal calificada y puede cambiar antes de entrar en vigor."

const LEGAL: Array<{
  slug: string
  en: { title: string; body: string }
  es: { title: string; body: string }
}> = [
  {
    slug: "privacy-policy",
    en: {
      title: "Privacy Policy",
      body: [
        DRAFT_EN,
        "Saludlink operates a commerce website at saludlinkusa.com that sells over-the-counter wellness and self-care products. This website is not a telehealth or medical-records application: clinical care is delivered separately by a licensed telehealth provider that we link to, and this website does not collect, store, or process protected health information (PHI).",
        "Information we collect. Account details you provide (name, email, phone), your orders and shipping and billing addresses, cart contents, payment references (we never store full card numbers — payments are processed by Stripe), messages you send our support team, and — only after you consent — privacy-respecting product analytics. We use this to operate the store, fulfill orders, provide support, and improve the site.",
        "Cookies we set. preview_ok remembers that you entered our early-access preview code; age_verified records that you attested to meeting the minimum age for an age-restricted product; sl_analytics_consent stores your analytics choice; and _medusa_jwt and _medusa_cart_id keep you signed in and preserve your cart. These are first-party cookies, set with the httpOnly and Secure flags where applicable, and are used to run the site — not to sell or share your data.",
        "Analytics and your consent. Product analytics (PostHog) are turned off by default and run only after you opt in through our cookie-consent banner. Session recording is disabled, form inputs are masked, and analytics profiles are created only for signed-in users. You can withdraw consent at any time, which stops future analytics collection.",
        "We do not sell your personal information.",
        "Health information. For health information handled through our connected, licensed telehealth services under HIPAA, see our Notice of Privacy Practices.",
        "Questions about your privacy? Contact us at [privacy@saludlinkusa.com].",
      ].join("\n\n"),
    },
    es: {
      title: "Política de privacidad",
      body: [
        DRAFT_ES,
        "Saludlink opera un sitio web de comercio en saludlinkusa.com que vende productos de bienestar y cuidado personal de venta libre. Este sitio web no es una aplicación de telesalud ni de expedientes médicos: la atención clínica la brinda por separado un proveedor de telesalud con licencia al que enlazamos, y este sitio web no recopila, almacena ni procesa información de salud protegida (PHI).",
        "Información que recopilamos. Los datos de cuenta que proporcionas (nombre, correo, teléfono), tus pedidos y direcciones de envío y facturación, el contenido del carrito, las referencias de pago (nunca almacenamos números de tarjeta completos — los pagos los procesa Stripe), los mensajes que envías a nuestro equipo de soporte y — solo tras tu consentimiento — analíticas de producto respetuosas de la privacidad. Usamos esto para operar la tienda, gestionar pedidos, brindar soporte y mejorar el sitio.",
        "Cookies que usamos. preview_ok recuerda que ingresaste nuestro código de acceso anticipado; age_verified registra que declaraste cumplir la edad mínima para un producto con restricción de edad; sl_analytics_consent almacena tu elección de analíticas; y _medusa_jwt y _medusa_cart_id mantienen tu sesión iniciada y conservan tu carrito. Son cookies propias, configuradas con los indicadores httpOnly y Secure cuando corresponde, y se usan para operar el sitio, no para vender ni compartir tus datos.",
        "Analíticas y tu consentimiento. Las analíticas de producto (PostHog) están desactivadas de forma predeterminada y solo funcionan después de que aceptes mediante nuestro banner de consentimiento de cookies. La grabación de sesión está desactivada, los campos de formulario se enmascaran y los perfiles de analíticas se crean solo para usuarios con sesión iniciada. Puedes retirar tu consentimiento en cualquier momento, lo que detiene la recopilación futura.",
        "No vendemos tu información personal.",
        "Información de salud. Para la información de salud gestionada mediante nuestros servicios de telesalud conectados y con licencia bajo HIPAA, consulta nuestro Aviso de prácticas de privacidad.",
        "¿Preguntas sobre tu privacidad? Escríbenos a [privacy@saludlinkusa.com].",
      ].join("\n\n"),
    },
  },
  {
    slug: "notice-of-privacy-practices",
    en: {
      title: "Notice of Privacy Practices",
      body: [
        DRAFT_EN,
        "This HIPAA Notice of Privacy Practices describes how protected health information (PHI) about you may be used and disclosed, and how you can get access to it. It applies to PHI handled through Saludlink's connected, licensed telehealth care services — not to the commerce website at saludlinkusa.com, which is a separate store that does not collect or store PHI.",
        "Your rights. You have the right to access and receive a copy of your health information, to request corrections, to request restrictions on certain uses and disclosures, to an accounting of disclosures, and to receive a paper copy of this notice.",
        "How we use and disclose PHI. We use and disclose PHI for treatment, payment, and health-care operations, and as otherwise permitted or required by law.",
        "Complaints. To exercise your rights or file a complaint, contact our Privacy Officer at [privacy@saludlinkusa.com], or the U.S. Department of Health and Human Services, Office for Civil Rights. We will not retaliate against you for filing a complaint.",
      ].join("\n\n"),
    },
    es: {
      title: "Aviso de prácticas de privacidad",
      body: [
        DRAFT_ES,
        "Este Aviso de prácticas de privacidad de HIPAA describe cómo se puede usar y divulgar la información de salud protegida (PHI) sobre ti, y cómo puedes acceder a ella. Aplica a la PHI gestionada mediante los servicios de atención de telesalud conectados y con licencia de Saludlink, no al sitio web de comercio en saludlinkusa.com, que es una tienda independiente que no recopila ni almacena PHI.",
        "Tus derechos. Tienes derecho a acceder y recibir una copia de tu información de salud, a solicitar correcciones, a pedir restricciones sobre ciertos usos y divulgaciones, a un registro de divulgaciones y a recibir una copia impresa de este aviso.",
        "Cómo usamos y divulgamos la PHI. Usamos y divulgamos la PHI para tratamiento, pago y operaciones de atención médica, y según lo permita o exija la ley.",
        "Quejas. Para ejercer tus derechos o presentar una queja, comunícate con nuestro Oficial de Privacidad en [privacy@saludlinkusa.com], o con la Oficina de Derechos Civiles del Departamento de Salud y Servicios Humanos de EE. UU. No tomaremos represalias por presentar una queja.",
      ].join("\n\n"),
    },
  },
  {
    slug: "terms-of-service",
    en: {
      title: "Terms of Service",
      body: [
        DRAFT_EN,
        "These Terms of Service govern your use of the Saludlink website and store at saludlinkusa.com. By using the site, you agree to these Terms. [Governing state, arbitration, and dispute-resolution terms to be finalized by counsel.]",
        "Eligibility and products. Our store offers over-the-counter (OTC) wellness products only — we do not sell or dispense prescription medications through this website. You may browse and check out as a guest or with an account. Some products are age-restricted: for those, you must confirm that you meet the minimum age (18 unless a higher age is stated on the product) before adding them to your cart. This is a self-attestation — we do not collect your date of birth.",
        "Customer reviews and other content you submit. If you submit a product review, you grant Saludlink permission to publish, edit, or remove it. All reviews are moderated before they appear; reviews that make unsupported health or disease-treatment claims are not published. Reviews from verified purchasers are labeled as such. Do not include personal health details in a review — this website is not the place for clinical information.",
        "Acceptable use, warranties, and limitation of liability. [To be finalized by counsel.]",
        "Health information and telehealth. Clinical care is provided by a separate, licensed telehealth service that we link to; use of that service is governed by its own terms and consent. Content on this website is educational only — see our Medical Disclaimer.",
      ].join("\n\n"),
    },
    es: {
      title: "Términos del servicio",
      body: [
        DRAFT_ES,
        "Estos Términos del servicio rigen el uso del sitio web y la tienda de Saludlink en saludlinkusa.com. Al usar el sitio, aceptas estos Términos. [Estado aplicable, arbitraje y términos de resolución de disputas a finalizar por asesoría legal.]",
        "Elegibilidad y productos. Nuestra tienda ofrece únicamente productos de bienestar de venta libre — no vendemos ni dispensamos medicamentos con receta a través de este sitio web. Puedes navegar y pagar como invitado o con una cuenta. Algunos productos tienen restricción de edad: para esos, debes confirmar que cumples la edad mínima (18 años, salvo que en el producto se indique una edad mayor) antes de agregarlos al carrito. Es una autodeclaración — no recopilamos tu fecha de nacimiento.",
        "Reseñas de clientes y otro contenido que envías. Si envías una reseña de producto, otorgas a Saludlink permiso para publicarla, editarla o eliminarla. Todas las reseñas se moderan antes de aparecer; las reseñas con afirmaciones de salud o de tratamiento de enfermedades sin respaldo no se publican. Las reseñas de compradores verificados se identifican como tales. No incluyas datos personales de salud en una reseña — este sitio no es el lugar para información clínica.",
        "Uso aceptable, garantías y limitación de responsabilidad. [A finalizar por asesoría legal.]",
        "Información de salud y telesalud. La atención clínica la brinda un servicio de telesalud independiente y con licencia al que enlazamos; el uso de ese servicio se rige por sus propios términos y consentimiento. El contenido de este sitio web es solo educativo — consulta nuestro Aviso médico.",
      ].join("\n\n"),
    },
  },
  {
    slug: "telehealth-consent",
    en: {
      title: "Consent to Telehealth",
      body: [
        DRAFT_EN,
        "Telehealth uses secure video and messaging to provide care remotely. Saludlink's website links to a separate, independent telehealth service where care is delivered by licensed providers; the website itself does not provide medical care. Telehealth services are available only in the states where our providers are licensed.",
        "Benefits and limitations. Telehealth can improve access and convenience, but it has limits — a provider may determine that an in-person visit is needed. Telehealth is not for emergencies. If you have a medical emergency, call 911 or go to the nearest emergency room.",
        "Your consent. By using the linked telehealth service, you consent to receive care by telehealth, and you may withdraw that consent at any time without affecting your ability to seek care in person. [Detailed consent terms to be finalized by counsel and the telehealth provider.]",
      ].join("\n\n"),
    },
    es: {
      title: "Consentimiento para telesalud",
      body: [
        DRAFT_ES,
        "La telesalud usa video y mensajería seguros para brindar atención a distancia. El sitio web de Saludlink enlaza a un servicio de telesalud independiente donde la atención la brindan proveedores con licencia; el sitio web en sí no brinda atención médica. Los servicios de telesalud están disponibles solo en los estados donde nuestros proveedores tienen licencia.",
        "Beneficios y limitaciones. La telesalud puede mejorar el acceso y la comodidad, pero tiene límites — un proveedor puede determinar que se necesita una visita en persona. La telesalud no es para emergencias. Si tienes una emergencia médica, llama al 911 o acude a la sala de emergencias más cercana.",
        "Tu consentimiento. Al usar el servicio de telesalud enlazado, consientes recibir atención por telesalud, y puedes retirar ese consentimiento en cualquier momento sin afectar tu capacidad de buscar atención en persona. [Términos de consentimiento detallados a finalizar por asesoría legal y el proveedor de telesalud.]",
      ].join("\n\n"),
    },
  },
  {
    slug: "refund-policy",
    en: {
      title: "Refund Policy",
      body: [
        DRAFT_EN,
        "Unopened products may be returned within 30 days of delivery. Approved refunds are issued to your original payment method (processed by Stripe) within 3–5 business days after we receive the returned item.",
        "Damaged or incorrect items. If your order arrives damaged or incorrect, report it within 7 days of delivery and we will arrange a replacement or refund.",
        "Non-returnable items. For health and safety reasons, certain items — such as opened consumable or personal-care products — cannot be returned. Any such restriction is noted on the product page.",
        "To start a return, contact [support@saludlinkusa.com].",
      ].join("\n\n"),
    },
    es: {
      title: "Política de reembolsos",
      body: [
        DRAFT_ES,
        "Los productos sin abrir pueden devolverse dentro de los 30 días posteriores a la entrega. Los reembolsos aprobados se emiten a tu método de pago original (procesado por Stripe) entre 3 y 5 días hábiles después de recibir el artículo devuelto.",
        "Artículos dañados o incorrectos. Si tu pedido llega dañado o incorrecto, repórtalo dentro de los 7 días posteriores a la entrega y organizaremos un reemplazo o reembolso.",
        "Artículos no retornables. Por razones de salud y seguridad, ciertos artículos — como productos consumibles o de cuidado personal ya abiertos — no pueden devolverse. Cualquier restricción de este tipo se indica en la página del producto.",
        "Para iniciar una devolución, comunícate con [support@saludlinkusa.com].",
      ].join("\n\n"),
    },
  },
  {
    slug: "shipping-policy",
    en: {
      title: "Shipping Policy",
      body: [
        DRAFT_EN,
        "Orders are processed within 1–2 business days and shipped by standard carriers within the United States. You will receive tracking information by email once your order ships.",
        "Shipping costs. Standard shipping is free on orders over $49; otherwise standard shipping rates are shown at checkout.",
        "Where we ship. Shipping availability varies by state, and some products can only be shipped to states where they are permitted. If a product isn't available for your state, that is indicated during checkout. See our state availability information for current coverage.",
        "We do not ship prescription medications; the store carries over-the-counter products only.",
      ].join("\n\n"),
    },
    es: {
      title: "Política de envíos",
      body: [
        DRAFT_ES,
        "Los pedidos se procesan en 1–2 días hábiles y se envían por transportistas estándar dentro de los Estados Unidos. Recibirás la información de seguimiento por correo electrónico una vez que se envíe tu pedido.",
        "Costos de envío. El envío estándar es gratis en pedidos superiores a $49; de lo contrario, las tarifas de envío estándar se muestran al finalizar la compra.",
        "A dónde enviamos. La disponibilidad de envío varía según el estado, y algunos productos solo pueden enviarse a los estados donde están permitidos. Si un producto no está disponible para tu estado, se indica al finalizar la compra. Consulta nuestra información de disponibilidad por estado para la cobertura actual.",
        "No enviamos medicamentos con receta; la tienda solo ofrece productos de venta libre.",
      ].join("\n\n"),
    },
  },
  {
    slug: "medical-disclaimer",
    en: {
      title: "Medical Disclaimer",
      body: [
        DRAFT_EN,
        "Content on this website is provided for educational purposes only and is not medical advice, diagnosis, or treatment. Statements about dietary supplements have not been evaluated by the U.S. Food and Drug Administration (FDA) and are not intended to diagnose, treat, cure, or prevent any disease.",
        "Always consult a qualified health-care provider before starting any product, especially if you are pregnant, nursing, taking medication, or have a medical condition. Never disregard professional medical advice because of something you read here.",
        "User-submitted reviews reflect individual opinions, are not medical advice, and are moderated to remove unsupported health claims. In an emergency, call 911.",
      ].join("\n\n"),
    },
    es: {
      title: "Aviso médico",
      body: [
        DRAFT_ES,
        "El contenido de este sitio web se proporciona únicamente con fines educativos y no es consejo médico, diagnóstico ni tratamiento. Las declaraciones sobre suplementos dietéticos no han sido evaluadas por la Administración de Alimentos y Medicamentos de EE. UU. (FDA) y no tienen la intención de diagnosticar, tratar, curar ni prevenir ninguna enfermedad.",
        "Consulta siempre a un proveedor de atención médica calificado antes de comenzar cualquier producto, especialmente si estás embarazada, amamantando, tomando medicamentos o tienes una condición médica. Nunca ignores el consejo médico profesional por algo que leas aquí.",
        "Las reseñas enviadas por usuarios reflejan opiniones individuales, no son consejo médico y se moderan para eliminar afirmaciones de salud sin respaldo. En caso de emergencia, llama al 911.",
      ].join("\n\n"),
    },
  },
  {
    slug: "accessibility",
    en: {
      title: "Accessibility",
      body: [
        DRAFT_EN,
        "Saludlink is committed to making saludlinkusa.com accessible and usable for everyone, and we aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. Accessibility is checked as part of our development and testing process.",
        "If you encounter an accessibility barrier on our website, please contact [accessibility@saludlinkusa.com] and we will work with you to provide the information or complete the transaction through an accessible alternative.",
      ].join("\n\n"),
    },
    es: {
      title: "Accesibilidad",
      body: [
        DRAFT_ES,
        "Saludlink se compromete a que saludlinkusa.com sea accesible y utilizable para todos, y buscamos cumplir con las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 nivel AA. La accesibilidad se verifica como parte de nuestro proceso de desarrollo y pruebas.",
        "Si encuentras una barrera de accesibilidad en nuestro sitio web, comunícate con [accessibility@saludlinkusa.com] y trabajaremos contigo para brindarte la información o completar la transacción por un medio accesible.",
      ].join("\n\n"),
    },
  },
  {
    slug: "editorial-policy",
    en: {
      title: "Editorial Policy",
      body: [
        DRAFT_EN,
        "Saludlink health content is written for accuracy, sourced from reputable references, and reviewed for quality before publication. We do not make health claims that are not supported by the FDA, the FTC, or comparable authorities.",
        "This standard also applies to content submitted by users: product reviews are moderated before they are published, and reviews that make unsupported health or disease-treatment claims are not approved.",
        "To request a correction, contact [editorial@saludlinkusa.com].",
      ].join("\n\n"),
    },
    es: {
      title: "Política editorial",
      body: [
        DRAFT_ES,
        "El contenido de salud de Saludlink se redacta con precisión, se basa en referencias confiables y se revisa por calidad antes de publicarse. No hacemos afirmaciones de salud sin respaldo de la FDA, la FTC o autoridades comparables.",
        "Este estándar también aplica al contenido enviado por usuarios: las reseñas de productos se moderan antes de publicarse, y las reseñas con afirmaciones de salud o de tratamiento de enfermedades sin respaldo no se aprueban.",
        "Para solicitar una corrección, comunícate con [editorial@saludlinkusa.com].",
      ].join("\n\n"),
    },
  },
  {
    slug: "nondiscrimination",
    en: {
      title: "Nondiscrimination",
      body: [
        DRAFT_EN,
        "Saludlink complies with applicable federal civil rights laws and does not discriminate on the basis of race, color, national origin, age, disability, or sex.",
        "Language assistance. Free language-assistance services are available, and the website is offered in English and Spanish. For assistance, contact [civilrights@saludlinkusa.com].",
      ].join("\n\n"),
    },
    es: {
      title: "No discriminación",
      body: [
        DRAFT_ES,
        "Saludlink cumple con las leyes federales de derechos civiles aplicables y no discrimina por motivos de raza, color, origen nacional, edad, discapacidad o sexo.",
        "Asistencia lingüística. Hay servicios gratuitos de asistencia lingüística disponibles, y el sitio web se ofrece en inglés y español. Para asistencia, comunícate con [civilrights@saludlinkusa.com].",
      ].join("\n\n"),
    },
  },
]

export default async function seedContent({ container }: ExecArgs) {
  const service: ContentModuleService = container.resolve(CONTENT_MODULE)

  /**
   * Refresh mode (`SEED_CONTENT_FORCE=1`).
   *
   * By default this seed SKIPS rows that already exist, so a routine re-run can
   * never clobber copy someone edited in Admin. The downside: once an
   * environment has been seeded, expanded copy in this file can NEVER reach it —
   * which is exactly what happened to prod (seeded from an older revision, so it
   * still serves the short one-paragraph policies while this file carries the
   * full multi-section versions).
   *
   * With the flag set, existing pages are rewritten from this file instead of
   * skipped. Opt-in on purpose: run it only when this file is the source of
   * truth, since it overwrites Admin edits for these slugs.
   */
  const force = process.env.SEED_CONTENT_FORCE === "1"

  // Legal / policy pages (EN + ES)
  let created = 0
  let updated = 0
  for (const p of LEGAL) {
    for (const locale of ["en", "es"] as const) {
      const [existing] = await service.listContentPages({
        slug: p.slug,
        locale,
      })
      if (existing) {
        if (!force) continue
        await service.updateContentPages({
          id: existing.id,
          title: p[locale].title,
          body: p[locale].body,
          status: "published",
          last_updated: "2026-07-24",
        })
        updated++
        continue
      }
      await service.createContentPages({
        slug: p.slug,
        locale,
        type: "legal",
        title: p[locale].title,
        body: p[locale].body,
        status: "published",
        last_updated: "2026-07-23",
      })
      created++
    }
  }

  // Sample health article (EN + ES)
  const articleSlug = "understanding-metabolic-health"
  for (const locale of ["en", "es"] as const) {
    const article = {
      slug: articleSlug,
      locale,
      title:
        locale === "en"
          ? "Understanding Metabolic Health"
          : "Entender la salud metabólica",
      excerpt:
        locale === "en"
          ? "What metabolic health means and everyday habits that support it."
          : "Qué significa la salud metabólica y hábitos diarios que la favorecen.",
      body:
        locale === "en"
          ? "Metabolic health refers to how well your body processes energy. Habits like balanced nutrition, movement, and sleep support it. This article is educational and not medical advice."
          : "La salud metabólica se refiere a qué tan bien tu cuerpo procesa la energía. Hábitos como la nutrición equilibrada, el movimiento y el sueño la favorecen. Este artículo es educativo y no constituye consejo médico.",
      category: "metabolic-health",
      author_name: "Saludlink Editorial",
      reviewer_name: "[Dr. Name, MD]",
      reviewer_credentials: "Board-certified physician",
      reviewed_at: "2026-07-22",
      status: "published",
      published_at: "2026-07-22",
    }

    const [existing] = await service.listArticles({ slug: articleSlug, locale })
    if (existing) {
      if (!force) continue
      await service.updateArticles({ id: existing.id, ...article })
      updated++
      continue
    }
    await service.createArticles(article)
    created++
  }

  // Site settings
  await service.upsertSetting(
    "contact",
    {
      legalEntity: "Saludlink, Inc.",
      addressLine: "[123 Example St, Suite 100]",
      city: "[City]",
      state: "[ST]",
      zip: "[00000]",
      phone: "[1-800-000-0000]",
      email: "support@saludlinkusa.com",
      hours: "Mon–Fri, 9am–6pm ET",
    },
    "Contact information"
  )
  await service.upsertSetting(
    "telemedicine_url",
    "https://care.saludlinkusa.com?utm_source=storefront&utm_medium=cta",
    "Telemedicine link-out URL"
  )
  await service.upsertSetting(
    "state_availability",
    [
      { code: "AZ", name: "Arizona", telehealth: true, shipping: true },
      { code: "CA", name: "California", telehealth: true, shipping: true },
      { code: "FL", name: "Florida", telehealth: true, shipping: true },
      { code: "TX", name: "Texas", telehealth: true, shipping: true },
      { code: "NY", name: "New York", telehealth: false, shipping: true },
    ],
    "State availability (LegitScript disclosure)"
  )

  console.log(
    `✔ Seeded content: ${created} created, ${updated} refreshed (pages/articles) + 3 settings` +
      (updated === 0 && !force
        ? " — existing rows were SKIPPED; re-run with SEED_CONTENT_FORCE=1 to refresh them from this file"
        : "")
  )
}
