import { ExecArgs } from "@medusajs/framework/types"
import { CONTENT_MODULE } from "../modules/content"
import ContentModuleService from "../modules/content/service"

/**
 * Seeds the Saludlink mini-CMS: the 10 legal/policy pages (EN + ES), a sample health
 * article, and site settings (contact, telemedicine link, state availability).
 * Run: npx medusa exec ./src/scripts/seed-content.ts
 * Idempotent — skips rows that already exist for a (slug, locale) / setting key.
 */

const LEGAL: Array<{
  slug: string
  en: { title: string; body: string }
  es: { title: string; body: string }
}> = [
  {
    slug: "privacy-policy",
    en: {
      title: "Privacy Policy",
      body: "This Privacy Policy explains what information Saludlink collects when you use our website and store, how we use it, and your choices. We collect account, order, and support information, and use privacy-respecting analytics. We do not sell your personal information. For health information covered by HIPAA, see our Notice of Privacy Practices. Contact [privacy@saludlinkusa.com].",
    },
    es: {
      title: "Política de privacidad",
      body: "Esta Política de privacidad explica qué información recopila Saludlink cuando usas nuestro sitio web y tienda, cómo la usamos y tus opciones. Recopilamos datos de cuenta, pedidos y soporte, y usamos analíticas respetuosas de la privacidad. No vendemos tu información personal. Para la información de salud protegida por HIPAA, consulta nuestro Aviso de prácticas de privacidad. Contacto: [privacy@saludlinkusa.com].",
    },
  },
  {
    slug: "notice-of-privacy-practices",
    en: {
      title: "Notice of Privacy Practices",
      body: "This HIPAA Notice describes how medical information about you may be used and disclosed and how you can access it. It applies to protected health information handled through our connected care services. You have rights to access, amend, and request restrictions. To file a complaint, contact our Privacy Officer at [privacy@saludlinkusa.com] or the U.S. HHS Office for Civil Rights.",
    },
    es: {
      title: "Aviso de prácticas de privacidad",
      body: "Este Aviso de HIPAA describe cómo se puede usar y divulgar tu información médica y cómo puedes acceder a ella. Aplica a la información de salud protegida gestionada mediante nuestros servicios de atención conectada. Tienes derecho a acceder, corregir y solicitar restricciones. Para presentar una queja, comunícate con nuestro Oficial de Privacidad en [privacy@saludlinkusa.com] o con la Oficina de Derechos Civiles del HHS de EE. UU.",
    },
  },
  {
    slug: "terms-of-service",
    en: {
      title: "Terms of Service",
      body: "These Terms govern your use of the Saludlink website and store. By using the site you agree to them. [Governing state and dispute terms to be finalized by counsel.]",
    },
    es: {
      title: "Términos del servicio",
      body: "Estos Términos rigen el uso del sitio web y la tienda de Saludlink. Al usar el sitio, los aceptas. [Estado aplicable y términos de disputa a finalizar por asesoría legal.]",
    },
  },
  {
    slug: "telehealth-consent",
    en: {
      title: "Consent to Telehealth",
      body: "Telehealth involves the use of secure video to provide care remotely. Saludlink links to a separate telehealth service where care is delivered by licensed providers. Telehealth is not for emergencies — if you have an emergency, call 911. You may withdraw consent at any time.",
    },
    es: {
      title: "Consentimiento para telesalud",
      body: "La telesalud implica el uso de video seguro para brindar atención a distancia. Saludlink enlaza a un servicio de telesalud independiente donde la atención la brindan proveedores con licencia. La telesalud no es para emergencias: si tienes una emergencia, llama al 911. Puedes retirar tu consentimiento en cualquier momento.",
    },
  },
  {
    slug: "refund-policy",
    en: {
      title: "Refund Policy",
      body: "Unopened products may be returned within 30 days of delivery for a refund to the original payment method, issued within 3–5 business days of receipt. Damaged items may be reported within 7 days. Certain items are non-returnable for safety reasons.",
    },
    es: {
      title: "Política de reembolsos",
      body: "Los productos sin abrir pueden devolverse dentro de los 30 días posteriores a la entrega para un reembolso al método de pago original, emitido entre 3 y 5 días hábiles tras la recepción. Los artículos dañados pueden reportarse dentro de los 7 días. Algunos artículos no son retornables por razones de seguridad.",
    },
  },
  {
    slug: "shipping-policy",
    en: {
      title: "Shipping Policy",
      body: "Orders are processed within 1–2 business days and shipped via standard carriers. Free shipping applies to orders over $49. Shipping availability may vary by state. Tracking is provided by email.",
    },
    es: {
      title: "Política de envíos",
      body: "Los pedidos se procesan en 1–2 días hábiles y se envían por transportistas estándar. El envío es gratis en pedidos superiores a $49. La disponibilidad de envío puede variar según el estado. El seguimiento se envía por correo electrónico.",
    },
  },
  {
    slug: "medical-disclaimer",
    en: {
      title: "Medical Disclaimer",
      body: "Content on this site is for educational purposes only and is not medical advice. Statements about dietary supplements have not been evaluated by the FDA and are not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified provider. In an emergency, call 911.",
    },
    es: {
      title: "Aviso médico",
      body: "El contenido de este sitio tiene únicamente fines educativos y no es consejo médico. Las declaraciones sobre suplementos dietéticos no han sido evaluadas por la FDA y no tienen la intención de diagnosticar, tratar, curar ni prevenir ninguna enfermedad. Consulta siempre a un proveedor calificado. En caso de emergencia, llama al 911.",
    },
  },
  {
    slug: "accessibility",
    en: {
      title: "Accessibility",
      body: "Saludlink is committed to WCAG 2.1 AA accessibility. If you encounter a barrier, contact [accessibility@saludlinkusa.com] and we will work to resolve it.",
    },
    es: {
      title: "Accesibilidad",
      body: "Saludlink se compromete con la accesibilidad WCAG 2.1 AA. Si encuentras una barrera, comunícate con [accessibility@saludlinkusa.com] y trabajaremos para resolverla.",
    },
  },
  {
    slug: "editorial-policy",
    en: {
      title: "Editorial Policy",
      body: "Our health content is written for accuracy, sourced from reputable references, and medically reviewed. We do not make claims unsupported by the FDA or FTC. Corrections may be requested at [editorial@saludlinkusa.com].",
    },
    es: {
      title: "Política editorial",
      body: "Nuestro contenido de salud se redacta con precisión, se basa en referencias confiables y cuenta con revisión médica. No hacemos afirmaciones sin respaldo de la FDA o la FTC. Puedes solicitar correcciones en [editorial@saludlinkusa.com].",
    },
  },
  {
    slug: "nondiscrimination",
    en: {
      title: "Nondiscrimination",
      body: "Saludlink complies with applicable civil rights laws and does not discriminate on the basis of race, color, national origin, age, disability, or sex. Language assistance is available. Contact [civilrights@saludlinkusa.com].",
    },
    es: {
      title: "No discriminación",
      body: "Saludlink cumple con las leyes de derechos civiles aplicables y no discrimina por motivos de raza, color, origen nacional, edad, discapacidad o sexo. Hay asistencia lingüística disponible. Contacto: [civilrights@saludlinkusa.com].",
    },
  },
]

export default async function seedContent({ container }: ExecArgs) {
  const service: ContentModuleService = container.resolve(CONTENT_MODULE)

  // Legal / policy pages (EN + ES)
  let created = 0
  for (const p of LEGAL) {
    for (const locale of ["en", "es"] as const) {
      const [existing] = await service.listContentPages({
        slug: p.slug,
        locale,
      })
      if (existing) continue
      await service.createContentPages({
        slug: p.slug,
        locale,
        type: "legal",
        title: p[locale].title,
        body: p[locale].body,
        status: "published",
        last_updated: "2026-07-22",
      })
      created++
    }
  }

  // Sample health article (EN + ES)
  const articleSlug = "understanding-metabolic-health"
  for (const locale of ["en", "es"] as const) {
    const [existing] = await service.listArticles({ slug: articleSlug, locale })
    if (existing) continue
    await service.createArticles({
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
    })
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

  console.log(`✔ Seeded content: ${created} pages/articles + 3 settings`)
}
