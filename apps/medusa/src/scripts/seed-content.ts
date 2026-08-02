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
        "This Privacy Policy explains how Saludlink, Inc. (“Saludlink,” “we,” “us”) collects, uses, shares, and protects personal information when you visit or make a purchase at saludlinkusa.com (the “Site”). Saludlink operates a commerce website that sells wellness products and compounded prescription medications. For prescription products, placing an order starts a review by a licensed physician on our care team, who may ask you follow-up health questions needed to evaluate your order; that limited health-screening information is handled under our Notice of Privacy Practices, not this Policy. Browsing the Site, creating an account, and purchasing non-prescription products does not involve protected health information (PHI). Our website also links to a separate, independent, licensed telehealth service for other kinds of care, governed by its own privacy practices, not this policy.",
        "Information you provide to us. When you create an account, place an order, or contact us, we collect the information you give us: your name, email address, phone number, shipping and billing addresses, order and cart contents, and the content of messages you send our support team. Payments are processed by our payment provider (Stripe); we receive a payment confirmation and a truncated card reference, and we never see or store your full card number.",
        "Information we collect automatically. When you use the Site we collect standard technical data such as your IP address, device and browser type, pages viewed, and referring links. Some of this is necessary to run and secure the Site; the rest (product analytics) runs only with your consent, as described below.",
        "Cookies and similar technologies. We use first-party cookies to run the Site: preview_ok remembers that you entered our early-access preview code; age_verified records that you attested to meeting the minimum age for an age-restricted product; sl_analytics_consent stores your analytics choice; and _medusa_jwt and _medusa_cart_id keep you signed in and preserve your cart. These are set with the httpOnly and Secure flags where applicable and are used to operate the Site — not to sell or share your data.",
        "Analytics and your consent. Product analytics (provided by PostHog) are turned OFF by default and run only after you opt in through our cookie-consent banner. Session recording is disabled, form inputs are masked, and analytics profiles are created only for signed-in users. You can withdraw consent at any time through the banner, which stops future analytics collection.",
        "How we use your information. We use personal information to operate the store; process, fulfill, and deliver your orders; take payment and prevent fraud; provide customer support; send order and service communications; comply with legal obligations; and, with your consent, understand and improve how the Site is used.",
        "How we share your information. We share personal information only with service providers who help us run the business under contract — for example payment processing (Stripe), order fulfillment and shipping carriers, cloud hosting, email delivery, and (with consent) analytics. We may disclose information if required by law or to protect our rights, and in connection with a business transfer such as a merger or acquisition. We do NOT sell your personal information, and we do not share it for cross-context behavioral advertising.",
        "Data retention. We keep personal information for as long as your account is active and as needed to provide the store, then for the period required to meet legal, tax, accounting, and dispute-resolution obligations, after which it is deleted or de-identified.",
        "Security. We use administrative, technical, and physical safeguards — including encryption in transit (TLS), access controls, and audit logging — designed to protect personal information. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
        "Your choices and rights. You may access or update your account information by signing in, and you can ask us to correct or delete your personal information or to close your account. Depending on where you live, you may have additional rights — such as the right to know, access, correct, delete, or opt out of the “sale” or “sharing” of personal information (for example under the California Consumer Privacy Act). We do not sell personal information. To exercise any right, contact us at support@saludlinkusa.com; we will not discriminate against you for doing so.",
        "Categories of personal information (California and similar states). In the past 12 months we have collected these categories of personal information: identifiers (such as name, email, phone, shipping/billing address, and IP address); commercial information (orders and purchase history); and internet or network activity (pages viewed and interactions), collected with your consent. We collect this information directly from you and automatically from your device, and we disclose it only to the service providers described above for the business purposes listed. Payment card numbers are handled by our processor (Stripe), not stored by us. We do not knowingly collect sensitive personal information to infer characteristics about you, and we do not use or disclose it for those purposes.",
        "Opt-out preference signals. Because we do not sell or share personal information for cross-context behavioral advertising, there is nothing to opt out of in that respect. Where required, we honor recognized browser opt-out preference signals such as the Global Privacy Control (GPC).",
        "Authorized agents and appeals. You may use an authorized agent to submit a request on your behalf, subject to verification of your identity and the agent’s authority. If we decline a request, you may appeal by replying to our response or writing to support@saludlinkusa.com, and — where your state requires it — we will inform you of the outcome and how to contact the relevant regulator. [Exact verification steps, response timelines, and state-specific disclosures to be finalized by counsel.]",
        "Children’s privacy. The Site is intended for adults and is not directed to children under 13, and we do not knowingly collect personal information from children under 13. Some products are age-restricted (18+ unless a higher age is stated).",
        "Changes to this policy. We may update this Privacy Policy from time to time; the “last updated” date shows when it last changed, and material changes will be highlighted on this page.",
        "Contact us. Questions or privacy requests? Email support@saludlinkusa.com or write to Saludlink, Inc. at the mailing address on our Contact page.",
      ].join("\n\n"),
    },
    es: {
      title: "Política de privacidad",
      body: [
        DRAFT_ES,
        "Esta Política de privacidad explica cómo Saludlink, Inc. (“Saludlink”, “nosotros”) recopila, usa, comparte y protege la información personal cuando visitas o compras en saludlinkusa.com (el “Sitio”). Saludlink opera un sitio web de comercio que vende productos de bienestar y medicamentos con receta compuestos. Para los productos con receta, hacer un pedido inicia una revisión por parte de un médico con licencia de nuestro equipo de atención, quien puede hacerte preguntas de salud de seguimiento necesarias para evaluar tu pedido; esa información limitada de evaluación de salud se gestiona bajo nuestro Aviso de prácticas de privacidad, no bajo esta Política. Navegar el Sitio, crear una cuenta y comprar productos sin receta no implica información de salud protegida (PHI). Nuestro sitio web también enlaza a un servicio de telesalud independiente y con licencia para otros tipos de atención, regido por sus propias prácticas de privacidad, no por esta política.",
        "Información que nos proporcionas. Cuando creas una cuenta, haces un pedido o nos contactas, recopilamos la información que nos das: tu nombre, correo electrónico, teléfono, direcciones de envío y facturación, el contenido de tus pedidos y carrito, y el contenido de los mensajes que envías a soporte. Los pagos los procesa nuestro proveedor de pagos (Stripe); recibimos una confirmación de pago y una referencia truncada de la tarjeta, y nunca vemos ni almacenamos el número completo de tu tarjeta.",
        "Información que recopilamos automáticamente. Cuando usas el Sitio recopilamos datos técnicos estándar como tu dirección IP, tipo de dispositivo y navegador, páginas vistas y enlaces de referencia. Parte de esto es necesario para operar y proteger el Sitio; el resto (analíticas de producto) funciona solo con tu consentimiento, como se describe abajo.",
        "Cookies y tecnologías similares. Usamos cookies propias para operar el Sitio: preview_ok recuerda que ingresaste el código de acceso anticipado; age_verified registra que declaraste cumplir la edad mínima para un producto con restricción de edad; sl_analytics_consent almacena tu elección de analíticas; y _medusa_jwt y _medusa_cart_id mantienen tu sesión iniciada y conservan tu carrito. Se configuran con los indicadores httpOnly y Secure cuando corresponde y se usan para operar el Sitio, no para vender ni compartir tus datos.",
        "Analíticas y tu consentimiento. Las analíticas de producto (de PostHog) están DESACTIVADAS de forma predeterminada y solo funcionan después de que aceptes mediante nuestro banner de consentimiento. La grabación de sesión está desactivada, los campos de formulario se enmascaran y los perfiles de analíticas se crean solo para usuarios con sesión iniciada. Puedes retirar tu consentimiento en cualquier momento desde el banner, lo que detiene la recopilación futura.",
        "Cómo usamos tu información. Usamos la información personal para operar la tienda; procesar, gestionar y entregar tus pedidos; cobrar y prevenir fraudes; brindar soporte; enviar comunicaciones de pedidos y servicio; cumplir obligaciones legales; y, con tu consentimiento, entender y mejorar el uso del Sitio.",
        "Cómo compartimos tu información. Compartimos información personal solo con proveedores de servicios que nos ayudan a operar el negocio bajo contrato — por ejemplo, procesamiento de pagos (Stripe), gestión de pedidos y transportistas, alojamiento en la nube, envío de correos y (con consentimiento) analíticas. Podemos divulgar información si la ley lo exige o para proteger nuestros derechos, y en relación con una transferencia de negocio como una fusión o adquisición. NO vendemos tu información personal, ni la compartimos para publicidad conductual entre contextos.",
        "Retención de datos. Conservamos la información personal mientras tu cuenta esté activa y según sea necesario para operar la tienda, y luego durante el período requerido para cumplir obligaciones legales, fiscales, contables y de resolución de disputas, tras lo cual se elimina o se anonimiza.",
        "Seguridad. Usamos salvaguardas administrativas, técnicas y físicas — incluyendo cifrado en tránsito (TLS), controles de acceso y registros de auditoría — diseñadas para proteger la información personal. Ningún método de transmisión o almacenamiento es completamente seguro, por lo que no podemos garantizar seguridad absoluta.",
        "Tus opciones y derechos. Puedes acceder o actualizar la información de tu cuenta iniciando sesión, y puedes pedirnos que corrijamos o eliminemos tu información personal o que cerremos tu cuenta. Según dónde vivas, puedes tener derechos adicionales — como el derecho a saber, acceder, corregir, eliminar u optar por no participar en la “venta” o el “compartir” de información personal (por ejemplo, bajo la Ley de Privacidad del Consumidor de California). No vendemos información personal. Para ejercer cualquier derecho, escríbenos a support@saludlinkusa.com; no te discriminaremos por hacerlo.",
        "Categorías de información personal (California y estados similares). En los últimos 12 meses hemos recopilado estas categorías de información personal: identificadores (como nombre, correo, teléfono, dirección de envío/facturación y dirección IP); información comercial (pedidos e historial de compras); y actividad en internet o la red (páginas vistas e interacciones), recopilada con tu consentimiento. Recopilamos esta información directamente de ti y automáticamente de tu dispositivo, y la divulgamos únicamente a los proveedores de servicios descritos arriba para los fines comerciales indicados. Los números de tarjeta los gestiona nuestro procesador (Stripe), no los almacenamos nosotros. No recopilamos a sabiendas información personal sensible para inferir características sobre ti, ni la usamos o divulgamos con esos fines.",
        "Señales de preferencia de exclusión. Como no vendemos ni compartimos información personal para publicidad conductual entre contextos, no hay nada de qué excluirse en ese sentido. Cuando corresponde, respetamos señales reconocidas de preferencia de exclusión del navegador, como el Global Privacy Control (GPC).",
        "Agentes autorizados y apelaciones. Puedes usar un agente autorizado para presentar una solicitud en tu nombre, sujeto a la verificación de tu identidad y de la autoridad del agente. Si rechazamos una solicitud, puedes apelar respondiendo a nuestra respuesta o escribiendo a support@saludlinkusa.com y — cuando tu estado lo exija — te informaremos el resultado y cómo contactar al regulador correspondiente. [Los pasos exactos de verificación, los plazos de respuesta y las divulgaciones estatales se finalizarán por asesoría legal.]",
        "Privacidad de menores. El Sitio está destinado a adultos y no se dirige a menores de 13 años, y no recopilamos a sabiendas información personal de menores de 13 años. Algunos productos tienen restricción de edad (18+ salvo que se indique una edad mayor).",
        "Cambios a esta política. Podemos actualizar esta Política de privacidad de vez en cuando; la fecha de “última actualización” indica cuándo cambió por última vez, y los cambios importantes se destacarán en esta página.",
        "Contáctanos. ¿Preguntas o solicitudes de privacidad? Escríbenos a support@saludlinkusa.com o a Saludlink, Inc. a la dirección postal de nuestra página de Contacto.",
      ].join("\n\n"),
    },
  },
  {
    slug: "notice-of-privacy-practices",
    en: {
      title: "Notice of Privacy Practices",
      body: [
        DRAFT_EN,
        "THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.",
        "Scope. This HIPAA Notice of Privacy Practices applies to protected health information (PHI) that Saludlink creates or receives through its connected, licensed telehealth care services. It does NOT apply to the commerce website at saludlinkusa.com, which is a separate store that does not collect, store, or process PHI — that Site is governed by our Privacy Policy. [Counsel to confirm whether Saludlink acts as a HIPAA covered entity or business associate for these services; the description below assumes covered-entity obligations.]",
        "Our duties. We are required by law to: maintain the privacy and security of your PHI; give you this Notice of our legal duties and privacy practices with respect to your PHI; follow the terms of the Notice currently in effect; and notify you promptly if a breach occurs that may have compromised the privacy or security of your PHI.",
        "Uses and disclosures for treatment, payment, and health care operations. Treatment — we may use and disclose your PHI to provide, coordinate, or manage your care and related services (for example, sharing information with the licensed provider treating you). Payment — we may use and disclose PHI to bill and obtain payment for services, including determining eligibility, and to process claims and collections. Health care operations — we may use and disclose PHI for quality assessment and improvement, care coordination, training, credentialing, and general administration.",
        "Other uses and disclosures permitted or required by law (without your authorization). Subject to legal conditions and limits, we may use or disclose PHI: as required by law; for public health activities (such as reporting disease or adverse events); about victims of abuse, neglect, or domestic violence; for health oversight activities (audits, investigations); in judicial and administrative proceedings (for example, in response to a subpoena or court order); for law-enforcement purposes; to coroners, medical examiners, and funeral directors; for organ, eye, or tissue donation; for research approved under a special process; to avert a serious and imminent threat to health or safety; for specialized government functions (such as military, national security, or protective services); for workers’ compensation as authorized by law; and to correctional institutions where applicable. We may also disclose PHI to business associates who perform services for us under a written agreement requiring them to safeguard your PHI.",
        "Optional communications. Where permitted, we may contact you with appointment reminders, information about treatment alternatives, or other health-related benefits and services; you may ask us to stop these. We will obtain your written authorization before any use or disclosure for marketing (beyond limited permitted communications), before any disclosure that is a sale of PHI, and before using or disclosing psychotherapy notes, if any.",
        "Uses and disclosures requiring your written authorization. Any use or disclosure of your PHI not described in this Notice will be made only with your written authorization. You may revoke an authorization in writing at any time, and we will stop the future uses and disclosures it permitted, except to the extent we have already relied on it.",
        "Your rights regarding your PHI. You have the right to: inspect and obtain a copy of your PHI (including an electronic copy where we hold it electronically), subject to limited exceptions and any allowed cost-based fee; request that we amend PHI you believe is incorrect or incomplete; receive an accounting of certain disclosures we have made; request restrictions on how we use or disclose your PHI (and we must agree to your request to restrict disclosure to a health plan for an item or service you paid for in full out of pocket); request that we communicate with you confidentially or at an alternative location; receive a paper copy of this Notice on request even if you agreed to receive it electronically; and be notified following a breach of your unsecured PHI. To exercise any of these rights, contact the Privacy Officer below.",
        "Changes to this Notice. We reserve the right to change this Notice and to make the revised Notice effective for PHI we already have as well as PHI we receive in the future. The current Notice will be posted here with its effective date, and a copy is available on request.",
        "Complaints. If you believe your privacy rights have been violated, you may file a complaint with our Privacy Officer at support@saludlinkusa.com, or with the U.S. Department of Health and Human Services, Office for Civil Rights (electronically at ocrportal.hhs.gov, or by mail or phone). We will not retaliate against you for filing a complaint.",
        "Contact and effective date. Privacy Officer: Saludlink, Inc., support@saludlinkusa.com (mailing address on our Contact page). Effective date: [to be set by counsel upon finalization].",
      ].join("\n\n"),
    },
    es: {
      title: "Aviso de prácticas de privacidad",
      body: [
        DRAFT_ES,
        "ESTE AVISO DESCRIBE CÓMO SE PUEDE USAR Y DIVULGAR LA INFORMACIÓN MÉDICA SOBRE USTED Y CÓMO PUEDE OBTENER ACCESO A ESTA INFORMACIÓN. REVÍSELO CON ATENCIÓN.",
        "Alcance. Este Aviso de prácticas de privacidad de HIPAA aplica a la información de salud protegida (PHI) que Saludlink crea o recibe a través de sus servicios de atención de telesalud conectados y con licencia. NO aplica al sitio web de comercio en saludlinkusa.com, que es una tienda independiente que no recopila, almacena ni procesa PHI — ese Sitio se rige por nuestra Política de privacidad. [La asesoría legal debe confirmar si Saludlink actúa como entidad cubierta o asociado comercial de HIPAA para estos servicios; la descripción siguiente asume obligaciones de entidad cubierta.]",
        "Nuestras obligaciones. La ley nos exige: mantener la privacidad y seguridad de tu PHI; entregarte este Aviso de nuestras obligaciones legales y prácticas de privacidad respecto de tu PHI; seguir los términos del Aviso vigente; y notificarte con prontitud si ocurre una violación que pueda haber comprometido la privacidad o seguridad de tu PHI.",
        "Usos y divulgaciones para tratamiento, pago y operaciones de atención médica. Tratamiento — podemos usar y divulgar tu PHI para brindar, coordinar o gestionar tu atención y servicios relacionados (por ejemplo, compartir información con el proveedor con licencia que te atiende). Pago — podemos usar y divulgar PHI para facturar y obtener el pago de los servicios, incluyendo determinar la elegibilidad, y para procesar reclamaciones y cobros. Operaciones de atención médica — podemos usar y divulgar PHI para evaluación y mejora de la calidad, coordinación de la atención, capacitación, credencialización y administración general.",
        "Otros usos y divulgaciones permitidos o exigidos por la ley (sin tu autorización). Sujeto a las condiciones y límites legales, podemos usar o divulgar PHI: según lo exija la ley; para actividades de salud pública (como reportar enfermedades o eventos adversos); sobre víctimas de abuso, negligencia o violencia doméstica; para actividades de supervisión sanitaria (auditorías, investigaciones); en procesos judiciales y administrativos (por ejemplo, en respuesta a una citación u orden judicial); para fines de las autoridades; a médicos forenses, examinadores y directores funerarios; para donación de órganos, ojos o tejidos; para investigación aprobada mediante un proceso especial; para evitar una amenaza grave e inminente a la salud o la seguridad; para funciones gubernamentales especializadas (como militares, seguridad nacional o servicios de protección); para compensación de trabajadores según lo autorice la ley; y a instituciones correccionales cuando corresponda. También podemos divulgar PHI a asociados comerciales que prestan servicios para nosotros bajo un acuerdo escrito que los obliga a proteger tu PHI.",
        "Comunicaciones opcionales. Cuando esté permitido, podemos contactarte con recordatorios de citas, información sobre alternativas de tratamiento u otros beneficios y servicios relacionados con la salud; puedes pedirnos que dejemos de hacerlo. Obtendremos tu autorización por escrito antes de cualquier uso o divulgación con fines de mercadeo (más allá de comunicaciones limitadas permitidas), antes de cualquier divulgación que constituya una venta de PHI, y antes de usar o divulgar notas de psicoterapia, si las hubiera.",
        "Usos y divulgaciones que requieren tu autorización por escrito. Cualquier uso o divulgación de tu PHI no descrito en este Aviso se hará solo con tu autorización por escrito. Puedes revocar una autorización por escrito en cualquier momento, y detendremos los usos y divulgaciones futuros que permitía, salvo en la medida en que ya nos hayamos basado en ella.",
        "Tus derechos sobre tu PHI. Tienes derecho a: inspeccionar y obtener una copia de tu PHI (incluida una copia electrónica cuando la tengamos en formato electrónico), sujeto a excepciones limitadas y a una posible tarifa basada en costos permitida; solicitar que enmendemos la PHI que consideres incorrecta o incompleta; recibir un registro de ciertas divulgaciones que hayamos hecho; solicitar restricciones sobre cómo usamos o divulgamos tu PHI (y debemos aceptar tu solicitud de restringir la divulgación a un plan de salud por un artículo o servicio que pagaste en su totalidad de tu bolsillo); solicitar que nos comuniquemos contigo de forma confidencial o en un lugar alternativo; recibir una copia impresa de este Aviso a solicitud aunque hayas aceptado recibirlo electrónicamente; y ser notificado tras una violación de tu PHI no protegida. Para ejercer cualquiera de estos derechos, contacta al Oficial de Privacidad indicado abajo.",
        "Cambios a este Aviso. Nos reservamos el derecho de cambiar este Aviso y de aplicar el Aviso revisado a la PHI que ya tenemos y a la que recibamos en el futuro. El Aviso vigente se publicará aquí con su fecha de entrada en vigor, y hay una copia disponible a solicitud.",
        "Quejas. Si consideras que se violaron tus derechos de privacidad, puedes presentar una queja ante nuestro Oficial de Privacidad en support@saludlinkusa.com, o ante la Oficina de Derechos Civiles del Departamento de Salud y Servicios Humanos de EE. UU. (de forma electrónica en ocrportal.hhs.gov, o por correo o teléfono). No tomaremos represalias por presentar una queja.",
        "Contacto y fecha de entrada en vigor. Oficial de Privacidad: Saludlink, Inc., support@saludlinkusa.com (dirección postal en nuestra página de Contacto). Fecha de entrada en vigor: [a establecer por asesoría legal al finalizar].",
      ].join("\n\n"),
    },
  },
  {
    slug: "terms-of-service",
    en: {
      title: "Terms of Service",
      body: [
        DRAFT_EN,
        "These Terms of Service (“Terms”) are a legal agreement between you and Saludlink, Inc. (“Saludlink,” “we,” “us”) governing your access to and use of the website and store at saludlinkusa.com (the “Site”). By accessing the Site, creating an account, or placing an order, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Site.",
        "Eligibility and accounts. You must be at least 18 years old to make a purchase. You are responsible for the accuracy of the information you provide, for keeping your account credentials confidential, and for all activity under your account. You may check out as a guest or with an account.",
        "Products — compounded prescription medications. The store offers compounded prescription medications, prepared under Section 503A of the Federal Food, Drug, and Cosmetic Act, alongside general wellness products. Prescription items are dispensed only against a valid, patient-specific prescription issued after review by a licensed physician on our care team; placing an order is a request for that review, not a guaranteed sale, and if the physician does not approve treatment your payment is refunded in full before anything ships. Compounded medications are not FDA-approved and are not affiliated with, endorsed by, or a substitute for any brand-name manufactured product referenced on a product page. Product descriptions are provided to be accurate and not misleading; we do not make claims that a product diagnoses, treats, cures, or prevents any disease, or that are not supported by the FDA, the FTC, or comparable authorities. See our Medical Disclaimer.",
        "Age-restricted products. Some products are age-restricted: for those, you must confirm that you meet the minimum age (18 unless a higher age is stated on the product page) before adding them to your cart. This is a self-attestation — we do not collect your date of birth.",
        "Orders, pricing, and payment. All orders are offers to purchase and are subject to our acceptance and to product availability; we may limit, cancel, or refuse an order, including for suspected fraud, pricing errors, or shipping restrictions in your state. Prices and availability may change. Payment is processed by our payment provider (Stripe); by placing an order you authorize the charge for the total shown at checkout. Shipping and returns are governed by our Shipping Policy and Refund Policy.",
        "Reviews and other content you submit. If you submit a product review or other content, you grant Saludlink a non-exclusive, royalty-free license to use, publish, edit, or remove it, and you represent that it is truthful and yours to share. All reviews are moderated before they appear; reviews that make unsupported health or disease-treatment claims are not published, and reviews from verified purchasers are labeled as such. Do not include personal health details in a review — the Site is not the place for clinical information.",
        "Acceptable use. You agree not to misuse the Site — including no unlawful use, no attempts to breach security or access other users’ data, no scraping or automated abuse, and no interference with the Site’s operation.",
        "Intellectual property. The Site, its content, and Saludlink’s trademarks and logos are owned by Saludlink or its licensors and are protected by law. You may not copy, modify, or distribute them without permission, except for content you are permitted to view and use in the ordinary course of using the Site.",
        "Third-party telehealth and links. Clinical care is provided by a separate, independent, licensed telehealth service that we link to; your use of that service is governed by its own terms and consent (see our Consent to Telehealth). We are not responsible for third-party websites or services.",
        "Electronic communications and consent. By creating an account or placing an order, you consent to receive transactional communications from us — such as order confirmations, shipping updates, and service notices — by email. We send marketing emails only if you opt in, and each one includes an unsubscribe link (consistent with the CAN-SPAM Act). We send text messages only with your prior express consent; message and data rates may apply, message frequency varies, and you can opt out at any time by replying STOP or contacting support@saludlinkusa.com.",
        "Disclaimers and limitation of liability. The Site and products are provided on an “as is” and “as available” basis to the fullest extent permitted by law, and content on the Site is educational only and not medical advice. [Warranty disclaimers, limitation of liability, indemnification, governing law, and binding-arbitration / dispute-resolution terms to be finalized by counsel.]",
        "General terms. [Severability, entire agreement, assignment, no-waiver, force majeure, and account-termination provisions to be finalized by counsel.]",
        "Changes and contact. We may update these Terms; the “last updated” date shows when they last changed, and continued use after changes means you accept them. Questions: support@saludlinkusa.com.",
      ].join("\n\n"),
    },
    es: {
      title: "Términos del servicio",
      body: [
        DRAFT_ES,
        "Estos Términos del servicio (“Términos”) son un acuerdo legal entre tú y Saludlink, Inc. (“Saludlink”, “nosotros”) que rige tu acceso y uso del sitio web y la tienda en saludlinkusa.com (el “Sitio”). Al acceder al Sitio, crear una cuenta o hacer un pedido, aceptas estos Términos y nuestra Política de privacidad. Si no estás de acuerdo, no uses el Sitio.",
        "Elegibilidad y cuentas. Debes tener al menos 18 años para realizar una compra. Eres responsable de la exactitud de la información que proporcionas, de mantener la confidencialidad de tus credenciales y de toda la actividad de tu cuenta. Puedes pagar como invitado o con una cuenta.",
        "Productos — medicamentos con receta compuestos. La tienda ofrece medicamentos con receta compuestos, preparados conforme a la Sección 503A de la Ley Federal de Alimentos, Medicamentos y Cosméticos, junto con productos generales de bienestar. Los artículos con receta se dispensan únicamente contra una receta válida y específica del paciente, emitida tras la revisión de un médico con licencia de nuestro equipo de atención; hacer un pedido es una solicitud de esa revisión, no una venta garantizada, y si el médico no aprueba el tratamiento se te reembolsa el pago en su totalidad antes de que se envíe nada. Los medicamentos compuestos no están aprobados por la FDA y no están afiliados, respaldados por, ni son un sustituto de ningún producto de marca fabricado que se mencione en la página de un producto. Las descripciones de productos se proporcionan de forma precisa y no engañosa; no hacemos afirmaciones de que un producto diagnostica, trata, cura o previene una enfermedad, ni afirmaciones sin respaldo de la FDA, la FTC o autoridades comparables. Consulta nuestro Aviso médico.",
        "Productos con restricción de edad. Algunos productos tienen restricción de edad: para esos, debes confirmar que cumples la edad mínima (18 años, salvo que en la página del producto se indique una edad mayor) antes de agregarlos al carrito. Es una autodeclaración — no recopilamos tu fecha de nacimiento.",
        "Pedidos, precios y pago. Todos los pedidos son ofertas de compra sujetas a nuestra aceptación y a la disponibilidad del producto; podemos limitar, cancelar o rechazar un pedido, incluso por sospecha de fraude, errores de precio o restricciones de envío en tu estado. Los precios y la disponibilidad pueden cambiar. El pago lo procesa nuestro proveedor de pagos (Stripe); al hacer un pedido autorizas el cargo por el total que se muestra al finalizar la compra. El envío y las devoluciones se rigen por nuestra Política de envíos y Política de reembolsos.",
        "Reseñas y otro contenido que envías. Si envías una reseña de producto u otro contenido, otorgas a Saludlink una licencia no exclusiva y libre de regalías para usarlo, publicarlo, editarlo o eliminarlo, y declaras que es veraz y tuyo para compartir. Todas las reseñas se moderan antes de aparecer; las reseñas con afirmaciones de salud o de tratamiento de enfermedades sin respaldo no se publican, y las reseñas de compradores verificados se identifican como tales. No incluyas datos personales de salud en una reseña — el Sitio no es el lugar para información clínica.",
        "Uso aceptable. Aceptas no hacer mal uso del Sitio — incluyendo ningún uso ilícito, ningún intento de vulnerar la seguridad o acceder a datos de otros usuarios, ningún raspado o abuso automatizado, y ninguna interferencia con el funcionamiento del Sitio.",
        "Propiedad intelectual. El Sitio, su contenido y las marcas y logotipos de Saludlink son propiedad de Saludlink o sus licenciantes y están protegidos por la ley. No puedes copiarlos, modificarlos ni distribuirlos sin permiso, salvo el contenido que se te permite ver y usar en el curso normal del uso del Sitio.",
        "Telesalud de terceros y enlaces. La atención clínica la brinda un servicio de telesalud independiente y con licencia al que enlazamos; tu uso de ese servicio se rige por sus propios términos y consentimiento (consulta nuestro Consentimiento para telesalud). No somos responsables de sitios o servicios de terceros.",
        "Comunicaciones electrónicas y consentimiento. Al crear una cuenta o hacer un pedido, consientes recibir de nuestra parte comunicaciones transaccionales — como confirmaciones de pedido, actualizaciones de envío y avisos de servicio — por correo electrónico. Enviamos correos de mercadeo solo si te suscribes, y cada uno incluye un enlace para darte de baja (de acuerdo con la Ley CAN-SPAM). Enviamos mensajes de texto solo con tu consentimiento previo expreso; pueden aplicarse tarifas de mensajes y datos, la frecuencia varía, y puedes cancelar en cualquier momento respondiendo STOP o escribiendo a support@saludlinkusa.com.",
        "Descargos y limitación de responsabilidad. El Sitio y los productos se proporcionan “tal cual” y “según disponibilidad” en la máxima medida permitida por la ley, y el contenido del Sitio es solo educativo y no consejo médico. [Descargos de garantía, limitación de responsabilidad, indemnización, ley aplicable y términos de arbitraje vinculante / resolución de disputas a finalizar por asesoría legal.]",
        "Términos generales. [Divisibilidad, acuerdo íntegro, cesión, no renuncia, fuerza mayor y disposiciones de terminación de cuenta a finalizar por asesoría legal.]",
        "Cambios y contacto. Podemos actualizar estos Términos; la fecha de “última actualización” indica cuándo cambiaron por última vez, y el uso continuado tras los cambios significa que los aceptas. Preguntas: support@saludlinkusa.com.",
      ].join("\n\n"),
    },
  },
  {
    slug: "telehealth-consent",
    en: {
      title: "Consent to Telehealth",
      body: [
        DRAFT_EN,
        "What telehealth is. Telehealth is the delivery of health care using secure video, audio, and messaging technologies when the patient and provider are in different locations. Saludlink’s website links to a separate, independent, licensed telehealth service for scheduled visits; the saludlinkusa.com store itself does not provide medical care. Telehealth care is available only in the states where the providers are licensed.",
        "Prescription order review, distinct from a telehealth visit. Compounded prescription products purchased directly on the store are instead reviewed asynchronously by a licensed physician on our care team as part of fulfilling that order (see our Terms of Service and Medical Disclaimer) — this is not a scheduled telehealth visit, but the same core protections in this Consent (voluntary, not for emergencies, PHI handled under our Notice of Privacy Practices) apply to it.",
        "The care process. Through the linked service you may complete an intake, share health information, and meet with a licensed provider who may evaluate you, discuss options, and — where clinically appropriate and legally permitted — recommend or order care. The provider uses professional judgment and may determine that telehealth is not appropriate for your situation.",
        "Expected benefits. Telehealth can improve access and convenience, reduce travel, and allow timely care from your own home.",
        "Risks and limitations. Because the provider cannot physically examine you, some conditions cannot be fully assessed by telehealth and an in-person visit or additional testing may be required. Technology can fail or be interrupted, which may delay or affect care. Despite reasonable safeguards, no electronic communication is completely secure. Telehealth outcomes cannot be guaranteed.",
        "Not for emergencies. Telehealth is NOT for medical emergencies. If you have or think you may have an emergency, call 911 or go to the nearest emergency room.",
        "Privacy of your information. Protected health information created through the telehealth service is handled under HIPAA; see our Notice of Privacy Practices and the telehealth provider’s notice.",
        "Your rights. Your consent to telehealth is voluntary. You may withhold or withdraw it at any time without affecting your right to future care or to seek care in person, and you may ask questions about the care you receive at any time.",
        "Your consent. By using the linked telehealth service, you acknowledge that you have read and understood this information and consent to receive care by telehealth. [Detailed, provider-specific consent terms — including any state-required disclosures and acknowledgments — to be finalized by counsel and the telehealth provider.] Questions: support@saludlinkusa.com.",
      ].join("\n\n"),
    },
    es: {
      title: "Consentimiento para telesalud",
      body: [
        DRAFT_ES,
        "Qué es la telesalud. La telesalud es la prestación de atención médica mediante tecnologías seguras de video, audio y mensajería cuando el paciente y el proveedor están en lugares distintos. El sitio web de Saludlink enlaza a un servicio de telesalud independiente y con licencia para consultas programadas; la tienda saludlinkusa.com en sí no brinda atención médica. La atención de telesalud está disponible solo en los estados donde los proveedores tienen licencia.",
        "Revisión de pedidos con receta, distinta de una consulta de telesalud. Los productos con receta compuestos comprados directamente en la tienda son revisados, en cambio, de forma asíncrona por un médico con licencia de nuestro equipo de atención como parte del cumplimiento de ese pedido (consulta nuestros Términos del servicio y Aviso médico) — esto no es una consulta de telesalud programada, pero se le aplican las mismas protecciones esenciales de este Consentimiento (voluntario, no para emergencias, PHI gestionada bajo nuestro Aviso de prácticas de privacidad).",
        "El proceso de atención. A través del servicio enlazado puedes completar una admisión, compartir información de salud y reunirte con un proveedor con licencia que puede evaluarte, comentar opciones y — cuando sea clínicamente apropiado y legalmente permitido — recomendar u ordenar atención. El proveedor usa su juicio profesional y puede determinar que la telesalud no es apropiada para tu situación.",
        "Beneficios esperados. La telesalud puede mejorar el acceso y la comodidad, reducir traslados y permitir atención oportuna desde tu propio hogar.",
        "Riesgos y limitaciones. Como el proveedor no puede examinarte físicamente, algunas condiciones no pueden evaluarse por completo por telesalud y puede requerirse una visita en persona o pruebas adicionales. La tecnología puede fallar o interrumpirse, lo que puede retrasar o afectar la atención. A pesar de salvaguardas razonables, ninguna comunicación electrónica es completamente segura. Los resultados de la telesalud no pueden garantizarse.",
        "No es para emergencias. La telesalud NO es para emergencias médicas. Si tienes o crees tener una emergencia, llama al 911 o acude a la sala de emergencias más cercana.",
        "Privacidad de tu información. La información de salud protegida creada mediante el servicio de telesalud se gestiona bajo HIPAA; consulta nuestro Aviso de prácticas de privacidad y el aviso del proveedor de telesalud.",
        "Tus derechos. Tu consentimiento para la telesalud es voluntario. Puedes negarlo o retirarlo en cualquier momento sin afectar tu derecho a atención futura o a buscar atención en persona, y puedes hacer preguntas sobre la atención que recibes en cualquier momento.",
        "Tu consentimiento. Al usar el servicio de telesalud enlazado, reconoces que has leído y comprendido esta información y consientes recibir atención por telesalud. [Términos de consentimiento detallados y específicos del proveedor — incluyendo divulgaciones y reconocimientos exigidos por el estado — a finalizar por asesoría legal y el proveedor de telesalud.] Preguntas: support@saludlinkusa.com.",
      ].join("\n\n"),
    },
  },
  {
    slug: "refund-policy",
    en: {
      title: "Refund Policy",
      body: [
        DRAFT_EN,
        "Our goal is for you to be satisfied with every order. This policy explains when and how you can return a product and receive a refund. It applies to purchases made on saludlinkusa.com.",
        "Return window and condition. Unopened products in their original packaging may be returned within 30 days of delivery. To protect all customers, returns must be unused and in resalable condition unless the item arrived damaged or defective.",
        "Compounded prescription medications. Compounded prescription items (for example, injectable weight-management or wellness medications) are prepared specifically for you and are excluded from the standard 30-day return window above — they cannot be returned once shipped, for health, safety, and regulatory reasons. Instead, every prescription order includes a no-cost physician review before it ships: if the reviewing physician does not approve your treatment, you are refunded in full and nothing is shipped.",
        "How to start a return. Email support@saludlinkusa.com with your order number and the item(s) you wish to return. We will confirm whether the item is eligible and provide return instructions before you ship anything back.",
        "Refund method and timing. Approved refunds — including a pre-shipment refund for a prescription order the physician did not approve — are issued to your original payment method (processed by our payment provider, Stripe) within 3–5 business days. For eligible returns, this is after we receive and inspect the returned item. Depending on your bank or card issuer, it may take additional time to appear on your statement.",
        "Damaged, defective, or incorrect items. If your order arrives damaged, defective, or incorrect, contact us within 7 days of delivery with a photo if possible, and we will arrange a replacement or a full refund at no cost to you.",
        "Non-returnable items. For health and safety reasons, certain items — such as opened consumable, ingestible, or personal-care products, and all compounded prescription medications once shipped — cannot be returned. Any such restriction is noted on the product page.",
        "Return shipping. For eligible returns of unwanted items, return shipping is the customer’s responsibility unless the return is due to our error or a damaged/defective product, in which case we cover it.",
        "Order cancellations. If you need to cancel an order, contact us as soon as possible. We can usually cancel before an order ships; once shipped, our return process applies.",
        "Questions about a return? Contact support@saludlinkusa.com.",
      ].join("\n\n"),
    },
    es: {
      title: "Política de reembolsos",
      body: [
        DRAFT_ES,
        "Nuestro objetivo es que quedes satisfecho con cada pedido. Esta política explica cuándo y cómo puedes devolver un producto y recibir un reembolso. Aplica a las compras hechas en saludlinkusa.com.",
        "Plazo y condición de devolución. Los productos sin abrir y en su empaque original pueden devolverse dentro de los 30 días posteriores a la entrega. Para proteger a todos los clientes, las devoluciones deben estar sin usar y en condición de reventa, salvo que el artículo haya llegado dañado o defectuoso.",
        "Medicamentos con receta compuestos. Los artículos con receta compuestos (por ejemplo, medicamentos inyectables para el manejo de peso o bienestar) se preparan específicamente para ti y quedan excluidos de la ventana estándar de devolución de 30 días descrita arriba — no pueden devolverse una vez enviados, por razones de salud, seguridad y regulación. En su lugar, todo pedido con receta incluye una revisión médica sin costo antes de enviarse: si el médico que revisa no aprueba tu tratamiento, se te reembolsa en su totalidad y no se envía nada.",
        "Cómo iniciar una devolución. Escribe a support@saludlinkusa.com con tu número de pedido y los artículos que deseas devolver. Confirmaremos si el artículo es elegible y te daremos instrucciones de devolución antes de que envíes nada de vuelta.",
        "Método y tiempo de reembolso. Los reembolsos aprobados — incluido el reembolso previo al envío de un pedido con receta que el médico no aprobó — se emiten a tu método de pago original (procesado por nuestro proveedor de pagos, Stripe) dentro de 3 a 5 días hábiles. Para devoluciones elegibles, este plazo aplica después de recibir e inspeccionar el artículo devuelto. Según tu banco o emisor de tarjeta, puede tardar más en aparecer en tu estado de cuenta.",
        "Artículos dañados, defectuosos o incorrectos. Si tu pedido llega dañado, defectuoso o incorrecto, contáctanos dentro de los 7 días posteriores a la entrega con una foto si es posible, y organizaremos un reemplazo o un reembolso completo sin costo para ti.",
        "Artículos no retornables. Por razones de salud y seguridad, ciertos artículos — como productos consumibles, ingeribles o de cuidado personal, y todos los medicamentos con receta compuestos una vez enviados — no pueden devolverse. Cualquier restricción de este tipo se indica en la página del producto.",
        "Envío de la devolución. Para devoluciones elegibles de artículos no deseados, el costo de envío de la devolución es responsabilidad del cliente, salvo que la devolución se deba a un error nuestro o a un producto dañado/defectuoso, en cuyo caso lo cubrimos nosotros.",
        "Cancelaciones de pedidos. Si necesitas cancelar un pedido, contáctanos lo antes posible. Por lo general podemos cancelar antes de que el pedido se envíe; una vez enviado, aplica nuestro proceso de devolución.",
        "¿Preguntas sobre una devolución? Escríbenos a support@saludlinkusa.com.",
      ].join("\n\n"),
    },
  },
  {
    slug: "shipping-policy",
    en: {
      title: "Shipping Policy",
      body: [
        DRAFT_EN,
        "This policy explains how and where we ship orders placed on saludlinkusa.com. We ship within the United States only.",
        "Order processing. Orders are typically processed within 1–2 business days (Monday–Friday, excluding holidays). Orders placed on weekends or holidays begin processing the next business day.",
        "Carriers and delivery estimates. Orders ship by standard carriers such as USPS or UPS. Estimated delivery is generally 3–7 business days after shipment, depending on your location; these are estimates, not guarantees, and carrier delays can occur.",
        "Shipping costs. Standard shipping is free on orders over $49. For orders at or below $49, standard shipping rates are calculated and shown at checkout before you pay.",
        "Order tracking. Once your order ships, we email you a tracking number so you can follow its progress.",
        "Where we ship and state restrictions. We ship within the United States. Shipping availability varies by state, and some products can only be shipped to states where they are permitted. If a product cannot be shipped to your state, that is indicated during checkout. See our Licensing & State Availability page for current coverage.",
        "Accurate shipping information. Please make sure your shipping address is correct at checkout. We are not responsible for orders delayed or lost due to an incorrect or incomplete address; if a package is returned to us as undeliverable, we will contact you to arrange reshipment or a refund.",
        "Lost, delayed, or damaged shipments. If your order is significantly delayed, does not arrive, or arrives damaged, contact us and we will help resolve it (see also our Refund Policy).",
        "Prescription medication shipments. Compounded prescription items ship only after your order has been reviewed and approved by a licensed physician (see our Refund Policy for what happens if it isn't). These items do not require refrigeration in transit; please refrigerate promptly once received if the product label says to. We do not currently ship internationally.",
        "Questions about shipping? Contact support@saludlinkusa.com.",
      ].join("\n\n"),
    },
    es: {
      title: "Política de envíos",
      body: [
        DRAFT_ES,
        "Esta política explica cómo y a dónde enviamos los pedidos realizados en saludlinkusa.com. Enviamos únicamente dentro de los Estados Unidos.",
        "Procesamiento de pedidos. Los pedidos normalmente se procesan en 1–2 días hábiles (lunes a viernes, excepto días festivos). Los pedidos realizados en fines de semana o festivos comienzan a procesarse el siguiente día hábil.",
        "Transportistas y tiempos estimados. Los pedidos se envían por transportistas estándar como USPS o UPS. La entrega estimada suele ser de 3–7 días hábiles después del envío, según tu ubicación; son estimaciones, no garantías, y pueden ocurrir retrasos del transportista.",
        "Costos de envío. El envío estándar es gratis en pedidos superiores a $49. Para pedidos de $49 o menos, las tarifas de envío estándar se calculan y se muestran al finalizar la compra antes de pagar.",
        "Seguimiento del pedido. Una vez que tu pedido se envía, te enviamos por correo un número de seguimiento para que puedas seguir su progreso.",
        "A dónde enviamos y restricciones por estado. Enviamos dentro de los Estados Unidos. La disponibilidad varía según el estado, y algunos productos solo pueden enviarse a los estados donde están permitidos. Si un producto no puede enviarse a tu estado, se indica al finalizar la compra. Consulta nuestra página de Licencias y disponibilidad por estado para la cobertura actual.",
        "Información de envío correcta. Asegúrate de que tu dirección de envío sea correcta al finalizar la compra. No somos responsables de pedidos retrasados o perdidos por una dirección incorrecta o incompleta; si un paquete se nos devuelve como no entregable, te contactaremos para reorganizar el envío o un reembolso.",
        "Envíos perdidos, retrasados o dañados. Si tu pedido se retrasa considerablemente, no llega o llega dañado, contáctanos y te ayudaremos a resolverlo (consulta también nuestra Política de reembolsos).",
        "Envíos de medicamentos con receta. Los artículos con receta compuestos se envían solo después de que un médico con licencia revise y apruebe tu pedido (consulta nuestra Política de reembolsos sobre qué ocurre si no se aprueba). Estos artículos no requieren refrigeración durante el envío; por favor refrigera de inmediato al recibirlo si la etiqueta del producto lo indica. Actualmente no realizamos envíos internacionales.",
        "¿Preguntas sobre envíos? Escríbenos a support@saludlinkusa.com.",
      ].join("\n\n"),
    },
  },
  {
    slug: "medical-disclaimer",
    en: {
      title: "Medical Disclaimer",
      body: [
        DRAFT_EN,
        "Educational purpose only. All content on saludlinkusa.com — including product descriptions, articles in our Learn journal, and any guidance — is provided for general educational and informational purposes only. It is not medical advice and is not a substitute for professional diagnosis, treatment, or the advice of a qualified health-care provider.",
        "Provider review for prescription products. Purchasing a compounded prescription product on this Site is a request for review by a licensed physician on our care team, who must evaluate and approve your order before any prescription is issued or medication ships — that review, not the act of browsing or purchasing itself, is what creates a limited provider–patient relationship, and only for that product. Browsing the Site, reading our educational content, or purchasing a non-prescription product does not create a provider–patient relationship. Separately, our website also links to an independent, licensed telehealth service for other kinds of visits, subject to its own terms and your consent (see our Consent to Telehealth).",
        "FDA statement on dietary supplements. Statements regarding dietary supplements have not been evaluated by the U.S. Food and Drug Administration (FDA) and are not intended to diagnose, treat, cure, or prevent any disease.",
        "No unsupported claims. We describe products accurately and do not claim benefits that are not supported by the FDA, the Federal Trade Commission (FTC), or comparable authorities. Individual results are not guaranteed and may vary from person to person.",
        "Consult a professional. Always talk with a qualified health-care provider before starting, stopping, or combining any product, supplement, or routine — especially if you are pregnant, nursing, under 18, taking medication, or have a medical condition. Read and follow all product labels and directions. Never disregard or delay seeking professional medical advice because of something you read on this website.",
        "User reviews. Customer reviews reflect individual opinions and experiences, are not medical advice, and are moderated to remove unsupported health or disease-treatment claims.",
        "Emergencies. This website and the linked telehealth service are not for emergencies. If you have or may have a medical emergency, call 911 or go to the nearest emergency room. Questions: support@saludlinkusa.com.",
      ].join("\n\n"),
    },
    es: {
      title: "Aviso médico",
      body: [
        DRAFT_ES,
        "Solo con fines educativos. Todo el contenido de saludlinkusa.com — incluidas las descripciones de productos, los artículos de nuestra revista Aprende y cualquier orientación — se proporciona únicamente con fines educativos e informativos generales. No es consejo médico ni sustituye el diagnóstico, el tratamiento o el consejo de un proveedor de atención médica calificado.",
        "Revisión médica para productos con receta. Comprar un producto con receta compuesto en este Sitio es una solicitud de revisión por un médico con licencia de nuestro equipo de atención, quien debe evaluar y aprobar tu pedido antes de que se emita cualquier receta o se envíe el medicamento — esa revisión, y no el simple hecho de navegar o comprar, es lo que crea una relación limitada de proveedor–paciente, y solo respecto de ese producto. Navegar el Sitio, leer nuestro contenido educativo o comprar un producto sin receta no crea una relación proveedor–paciente. Por separado, nuestro sitio web también enlaza a un servicio de telesalud independiente y con licencia para otros tipos de consultas, sujeto a sus propios términos y a tu consentimiento (consulta nuestro Consentimiento para telesalud).",
        "Declaración de la FDA sobre suplementos dietéticos. Las declaraciones sobre suplementos dietéticos no han sido evaluadas por la Administración de Alimentos y Medicamentos de EE. UU. (FDA) y no tienen la intención de diagnosticar, tratar, curar ni prevenir ninguna enfermedad.",
        "Sin afirmaciones sin respaldo. Describimos los productos con precisión y no afirmamos beneficios que no cuenten con el respaldo de la FDA, la Comisión Federal de Comercio (FTC) o autoridades comparables. Los resultados individuales no están garantizados y pueden variar de una persona a otra.",
        "Consulta a un profesional. Habla siempre con un proveedor de atención médica calificado antes de comenzar, suspender o combinar cualquier producto, suplemento o rutina — especialmente si estás embarazada, amamantando, eres menor de 18 años, tomas medicamentos o tienes una condición médica. Lee y sigue todas las etiquetas e instrucciones de los productos. Nunca ignores ni retrases la búsqueda de consejo médico profesional por algo que leas en este sitio web.",
        "Reseñas de usuarios. Las reseñas de clientes reflejan opiniones y experiencias individuales, no son consejo médico y se moderan para eliminar afirmaciones de salud o de tratamiento de enfermedades sin respaldo.",
        "Emergencias. Este sitio web y el servicio de telesalud enlazado no son para emergencias. Si tienes o podrías tener una emergencia médica, llama al 911 o acude a la sala de emergencias más cercana. Preguntas: support@saludlinkusa.com.",
      ].join("\n\n"),
    },
  },
  {
    slug: "accessibility",
    en: {
      title: "Accessibility",
      body: [
        DRAFT_EN,
        "Our commitment. Saludlink is committed to making saludlinkusa.com accessible and usable for everyone, including people who use assistive technologies such as screen readers, magnification, or keyboard-only navigation. We believe access to health and wellness information should be available to all.",
        "Standard we aim for. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. Accessibility is part of how we build and test the Site — including automated accessibility checks in our development process — and we work to improve it on an ongoing basis.",
        "Ongoing effort and third-party content. Accessibility is a continuous process, and some content or third-party components may not yet fully conform. We are actively working to identify and fix issues, and we welcome feedback that helps us prioritize.",
        "Need help or found a barrier? If you have difficulty using any part of the Site, or you encounter an accessibility barrier, contact support@saludlinkusa.com. Please describe the page and the problem, and we will work with you to provide the information you need or to complete your transaction through an accessible alternative, and to address the issue.",
      ].join("\n\n"),
    },
    es: {
      title: "Accesibilidad",
      body: [
        DRAFT_ES,
        "Nuestro compromiso. Saludlink se compromete a que saludlinkusa.com sea accesible y utilizable para todos, incluidas las personas que usan tecnologías de asistencia como lectores de pantalla, ampliación o navegación solo con teclado. Creemos que el acceso a la información de salud y bienestar debe estar disponible para todos.",
        "El estándar que buscamos. Buscamos cumplir con las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 nivel AA. La accesibilidad es parte de cómo construimos y probamos el Sitio — incluidas verificaciones de accesibilidad automatizadas en nuestro proceso de desarrollo — y trabajamos para mejorarla de forma continua.",
        "Esfuerzo continuo y contenido de terceros. La accesibilidad es un proceso continuo, y es posible que parte del contenido o de los componentes de terceros aún no cumpla por completo. Trabajamos activamente para identificar y corregir problemas, y agradecemos los comentarios que nos ayuden a priorizar.",
        "¿Necesitas ayuda o encontraste una barrera? Si tienes dificultades para usar cualquier parte del Sitio, o encuentras una barrera de accesibilidad, escríbenos a support@saludlinkusa.com. Describe la página y el problema, y trabajaremos contigo para brindarte la información que necesitas o completar tu transacción por un medio accesible, y para resolver el problema.",
      ].join("\n\n"),
    },
  },
  {
    slug: "editorial-policy",
    en: {
      title: "Editorial Policy",
      body: [
        DRAFT_EN,
        "Purpose. Our Learn journal publishes general health-education content to help you make informed decisions about weight and metabolic health. It is educational only and is not medical advice (see our Medical Disclaimer).",
        "Who writes our content. Articles are written by the Saludlink editorial team. We tell you who wrote a piece, and we do not attribute content to authors or reviewers who were not involved.",
        "How we source and cite. We rely on reputable, primarily U.S. sources — such as the FDA, CDC, and established medical institutions and peer-reviewed literature — and we cite the sources used so you can verify them. We aim for accuracy and plain language over hype.",
        "No unsupported claims. Consistent with FDA and FTC standards, we do not claim that any product or approach diagnoses, treats, cures, or prevents disease, or state benefits that are not supported by those authorities. We describe what evidence does and does not show.",
        "On medical review — an honest note. Our articles are written and cited by our editorial team; they are NOT individually reviewed or endorsed by a licensed clinician, and we do not label them as “medically reviewed.” They are a starting point for learning, not a substitute for personalized advice from your own provider.",
        "Independence and disclosure. Saludlink sells wellness products, so we have a commercial interest. We keep educational content separate from sales copy, and where content refers to products we sell or to any material connection, we disclose it. Editorial content is not for sale.",
        "User-generated content. Product reviews are moderated before publication; reviews that make unsupported health or disease-treatment claims, or that include personal health details, are not approved. Reviews from verified purchasers are labeled as such.",
        "Corrections. We fix errors promptly. To request a correction or flag a concern, contact support@saludlinkusa.com.",
      ].join("\n\n"),
    },
    es: {
      title: "Política editorial",
      body: [
        DRAFT_ES,
        "Propósito. Nuestra revista Aprende publica contenido general de educación en salud para ayudarte a tomar decisiones informadas sobre la salud metabólica y de peso. Es solo educativo y no es consejo médico (consulta nuestro Aviso médico).",
        "Quién redacta nuestro contenido. Los artículos los redacta el equipo editorial de Saludlink. Te indicamos quién escribió cada pieza, y no atribuimos contenido a autores o revisores que no participaron.",
        "Cómo obtenemos y citamos las fuentes. Nos basamos en fuentes confiables, principalmente de EE. UU. — como la FDA, los CDC, e instituciones médicas reconocidas y literatura revisada por pares — y citamos las fuentes utilizadas para que puedas verificarlas. Priorizamos la precisión y el lenguaje claro por encima de la exageración.",
        "Sin afirmaciones sin respaldo. De acuerdo con los estándares de la FDA y la FTC, no afirmamos que ningún producto o método diagnostique, trate, cure o prevenga enfermedades, ni indicamos beneficios sin el respaldo de esas autoridades. Describimos lo que la evidencia muestra y lo que no.",
        "Sobre la revisión médica — una nota honesta. Nuestros artículos los redacta y cita nuestro equipo editorial; NO son revisados ni avalados individualmente por un profesional clínico con licencia, y no los etiquetamos como “revisados médicamente”. Son un punto de partida para aprender, no un sustituto del consejo personalizado de tu propio proveedor.",
        "Independencia y divulgación. Saludlink vende productos de bienestar, por lo que tenemos un interés comercial. Mantenemos el contenido educativo separado del texto de ventas, y cuando el contenido se refiere a productos que vendemos o a cualquier conexión relevante, lo divulgamos. El contenido editorial no está a la venta.",
        "Contenido de usuarios. Las reseñas de productos se moderan antes de publicarse; las reseñas con afirmaciones de salud o de tratamiento de enfermedades sin respaldo, o que incluyan datos personales de salud, no se aprueban. Las reseñas de compradores verificados se identifican como tales.",
        "Correcciones. Corregimos los errores con prontitud. Para solicitar una corrección o señalar una inquietud, escríbenos a support@saludlinkusa.com.",
      ].join("\n\n"),
    },
  },
  {
    slug: "nondiscrimination",
    en: {
      title: "Nondiscrimination",
      body: [
        DRAFT_EN,
        "Saludlink complies with applicable federal civil rights laws and does not discriminate, exclude people, or treat them differently on the basis of race, color, national origin, age, disability, or sex.",
        "Services for people with disabilities. We provide, free of charge, aids and services to people with disabilities to communicate effectively with us — such as accessible electronic formats and other assistance. See our Accessibility statement.",
        "Language assistance. We provide, free of charge, language-assistance services to people whose primary language is not English. Our website and support are offered in English and Spanish, and we will work to assist speakers of other languages on request.",
        "How to raise a concern or file a grievance. If you believe Saludlink failed to provide these services or discriminated in another way, you may file a grievance with our Civil Rights Coordinator at support@saludlinkusa.com, or by mail to Saludlink, Inc. at the address on our Contact page. We will not retaliate against you for filing a grievance.",
        "Filing with the government. You may also file a civil rights complaint with the U.S. Department of Health and Human Services, Office for Civil Rights, electronically through its Complaint Portal at ocrportal.hhs.gov, or by mail or phone. [Final nondiscrimination notice, tagline languages, and coordinator details to be confirmed by counsel based on applicable requirements.]",
      ].join("\n\n"),
    },
    es: {
      title: "No discriminación",
      body: [
        DRAFT_ES,
        "Saludlink cumple con las leyes federales de derechos civiles aplicables y no discrimina, ni excluye a las personas, ni las trata de manera diferente por motivos de raza, color, origen nacional, edad, discapacidad o sexo.",
        "Servicios para personas con discapacidad. Ofrecemos, de forma gratuita, ayudas y servicios a las personas con discapacidad para comunicarse eficazmente con nosotros — como formatos electrónicos accesibles y otra asistencia. Consulta nuestra declaración de Accesibilidad.",
        "Asistencia lingüística. Ofrecemos, de forma gratuita, servicios de asistencia lingüística a las personas cuyo idioma principal no es el inglés. Nuestro sitio web y soporte se ofrecen en inglés y español, y trabajaremos para asistir a hablantes de otros idiomas a solicitud.",
        "Cómo plantear una inquietud o presentar una queja. Si consideras que Saludlink no brindó estos servicios o discriminó de otra manera, puedes presentar una queja ante nuestro Coordinador de Derechos Civiles en support@saludlinkusa.com, o por correo postal a Saludlink, Inc. a la dirección de nuestra página de Contacto. No tomaremos represalias por presentar una queja.",
        "Presentar una queja ante el gobierno. También puedes presentar una queja de derechos civiles ante la Oficina de Derechos Civiles del Departamento de Salud y Servicios Humanos de EE. UU., de forma electrónica a través de su Portal de Quejas en ocrportal.hhs.gov, o por correo o teléfono. [Aviso de no discriminación final, idiomas de los avisos y datos del coordinador a confirmar por asesoría legal según los requisitos aplicables.]",
      ].join("\n\n"),
    },
  },
]

/**
 * Health-education articles for the /learn magazine. Educational only — no
 * diagnosis/treatment/cure claims (LegitScript). Each is bilingual; bodies are
 * paragraph-separated with \n\n. Merchants edit/expand these in the admin.
 */
const ARTICLES: Array<{
  slug: string
  category: string
  en: { title: string; excerpt: string; body: string }
  es: { title: string; excerpt: string; body: string }
}> = [
  {
    slug: "understanding-metabolic-health",
    category: "metabolic-health",
    en: {
      title: "Understanding Metabolic Health",
      excerpt:
        "What metabolic health actually means, the markers that matter, and the everyday habits that support it.",
      body: [
        "Metabolic health describes how efficiently your body turns food into energy and keeps everyday systems — blood sugar, blood pressure, cholesterol, waist circumference — in a healthy range. It is not a single number but a picture built from several markers together.",
        "Clinicians use five widely harmonized markers, and having any three of them defines metabolic syndrome: a larger waist (over 40 inches in men, over 35 inches in women), blood pressure at or above 130/85 mmHg, triglycerides at or above 150 mg/dL, HDL (“good”) cholesterol below 40 mg/dL in men or 50 mg/dL in women, and fasting blood glucose at or above 100 mg/dL. Your own targets are a conversation to have with a licensed provider.",
        "The daily habits that support these markers are unglamorous but well studied: balanced meals with adequate protein and fiber, regular movement across the week, consistent sleep, and managing stress. Small, repeatable changes tend to outlast dramatic ones.",
        "This article is educational and is not medical advice, diagnosis, or treatment. If you have questions about your own metabolic health, talk with a qualified healthcare provider — in an emergency, call 911.",
        "Sources: Mayo Clinic and Cleveland Clinic, metabolic-syndrome diagnostic criteria (reviewed 2025).",
      ].join("\n\n"),
    },
    es: {
      title: "Entender la salud metabólica",
      excerpt:
        "Qué significa realmente la salud metabólica, los marcadores que importan y los hábitos diarios que la favorecen.",
      body: [
        "La salud metabólica describe qué tan eficientemente tu cuerpo convierte los alimentos en energía y mantiene sistemas cotidianos — azúcar en sangre, presión arterial, colesterol, circunferencia de cintura — en un rango saludable. No es un solo número, sino un panorama formado por varios marcadores en conjunto.",
        "Los profesionales usan cinco marcadores ampliamente armonizados, y tener cualquiera de tres define el síndrome metabólico: cintura más grande (más de 40 pulgadas en hombres, más de 35 en mujeres), presión arterial igual o mayor a 130/85 mmHg, triglicéridos iguales o mayores a 150 mg/dL, colesterol HDL (“bueno”) por debajo de 40 mg/dL en hombres o 50 mg/dL en mujeres, y glucosa en ayunas igual o mayor a 100 mg/dL. Tus objetivos son una conversación con un proveedor con licencia.",
        "Los hábitos diarios que apoyan estos marcadores son sencillos pero bien estudiados: comidas equilibradas con suficiente proteína y fibra, movimiento regular durante la semana, sueño constante y manejo del estrés. Los cambios pequeños y repetibles suelen durar más que los drásticos.",
        "Este artículo es educativo y no constituye consejo médico, diagnóstico ni tratamiento. Si tienes dudas sobre tu salud metabólica, habla con un proveedor de salud calificado — en una emergencia, llama al 911.",
        "Fuentes: Mayo Clinic y Cleveland Clinic, criterios diagnósticos del síndrome metabólico (revisado 2025).",
      ].join("\n\n"),
    },
  },
  {
    slug: "protein-and-satiety",
    category: "nutrition",
    en: {
      title: "Protein and Satiety: What the Evidence Shows",
      excerpt:
        "Why protein helps you feel full, how much is reasonable, and simple ways to spread it across the day.",
      body: [
        "Of the three macronutrients, protein is the most consistently linked to satiety — the feeling of fullness that helps you stop eating. It digests slowly and influences appetite-related signals, which is why protein-forward meals often leave people satisfied for longer.",
        "The baseline recommendation (RDA) for healthy adults is about 0.8 grams of protein per kilogram of body weight per day. Older adults — roughly 65 and up — and very active people are often advised to aim higher, around 1.2 to 1.6 g/kg, to help preserve muscle. Your individual target depends on your health, activity, and goals, and is best set with a provider or dietitian.",
        "Practical habits matter more than precision: include a protein source at each meal, front-load some at breakfast rather than saving it all for dinner, and pair protein with fiber-rich foods for a steadier, more satisfying plate.",
        "This article is educational and is not medical or nutritional advice. Talk to a qualified healthcare provider before making significant dietary changes.",
        "Sources: UCLA Health and the National Council on Aging, adult and older-adult protein guidance (2024–2025).",
      ].join("\n\n"),
    },
    es: {
      title: "Proteína y saciedad: qué muestra la evidencia",
      excerpt:
        "Por qué la proteína ayuda a sentirte satisfecho, cuánta es razonable y formas simples de distribuirla en el día.",
      body: [
        "De los tres macronutrientes, la proteína es la que se asocia de forma más constante con la saciedad — esa sensación de plenitud que ayuda a dejar de comer. Se digiere lentamente e influye en las señales del apetito, por eso las comidas con más proteína suelen satisfacer por más tiempo.",
        "La recomendación base (RDA) para adultos sanos es de aproximadamente 0,8 gramos de proteína por kilogramo de peso al día. A los adultos mayores — de unos 65 años en adelante — y a las personas muy activas se les suele aconsejar apuntar más alto, alrededor de 1,2 a 1,6 g/kg, para ayudar a preservar el músculo. Tu objetivo individual depende de tu salud, actividad y metas, y se define mejor con un proveedor o nutricionista.",
        "Los hábitos prácticos importan más que la precisión: incluye una fuente de proteína en cada comida, prioriza algo en el desayuno en lugar de dejarlo todo para la cena, y combina la proteína con alimentos ricos en fibra para un plato más estable y saciante.",
        "Este artículo es educativo y no constituye consejo médico ni nutricional. Consulta a un proveedor de salud calificado antes de hacer cambios importantes en tu dieta.",
        "Fuentes: UCLA Health y el National Council on Aging, orientación de proteína para adultos y adultos mayores (2024–2025).",
      ].join("\n\n"),
    },
  },
  {
    slug: "building-movement-habits",
    category: "weight-management",
    en: {
      title: "Building Movement Habits That Last",
      excerpt:
        "The most effective exercise plan is the one you keep. A calmer, more sustainable way to start moving.",
      body: [
        "When it comes to movement, consistency beats intensity. A brisk daily walk you actually do outperforms an ambitious program you abandon in three weeks. The goal at the start is not performance — it is building an identity as someone who moves.",
        "National guidance is a helpful target to grow into: 150 to 300 minutes of moderate aerobic activity a week — as little as 30 minutes, five days — plus muscle-strengthening on two or more days that works the major muscle groups. You can break it into small chunks, you do not need a gym, and some activity is always better than none.",
        "Anchor new habits to existing ones — a walk after lunch, mobility while the coffee brews — and make the first step small enough that it feels almost too easy. Momentum compounds.",
        "This article is educational and is not medical advice. If you have a health condition or have been inactive, check with a qualified provider before starting a new exercise routine.",
        "Sources: CDC and the U.S. Physical Activity Guidelines for Americans (2nd edition).",
      ].join("\n\n"),
    },
    es: {
      title: "Crear hábitos de movimiento que perduren",
      excerpt:
        "El mejor plan de ejercicio es el que mantienes. Una forma más tranquila y sostenible de empezar a moverte.",
      body: [
        "En el movimiento, la constancia supera a la intensidad. Una caminata diaria que de verdad haces rinde más que un programa ambicioso que abandonas en tres semanas. La meta al inicio no es el rendimiento — es construir la identidad de alguien que se mueve.",
        "La orientación nacional es una buena meta para ir alcanzando: de 150 a 300 minutos de actividad aeróbica moderada a la semana — tan poco como 30 minutos, cinco días — más ejercicios de fuerza en dos o más días que trabajen los grupos musculares principales. Puedes dividirlo en bloques pequeños, no necesitas un gimnasio, y algo de actividad siempre es mejor que nada.",
        "Ancla los hábitos nuevos a los que ya tienes — una caminata después del almuerzo, movilidad mientras se hace el café — y haz que el primer paso sea tan pequeño que resulte casi demasiado fácil. El impulso se acumula.",
        "Este artículo es educativo y no constituye consejo médico. Si tienes una condición de salud o has estado inactivo, consulta a un proveedor calificado antes de iniciar una nueva rutina de ejercicio.",
        "Fuentes: CDC y las Guías de Actividad Física para Estadounidenses (2.ª edición).",
      ].join("\n\n"),
    },
  },
  {
    slug: "reading-body-composition",
    category: "monitoring",
    en: {
      title: "Reading Your Body-Composition Numbers",
      excerpt:
        "Weight is one signal among many. How to think about body composition without fixating on the scale.",
      body: [
        "The scale measures one thing: total mass. It cannot tell muscle from fat from water, which is why weight can bounce day to day for reasons that have nothing to do with progress — hydration, sodium, sleep, and the normal rhythms of the body.",
        "Body-composition tools estimate the share of your weight that is fat versus lean tissue. At-home devices give trends rather than clinical precision, so the pattern over weeks matters far more than any single reading.",
        "Pairing a few signals — how clothes fit, energy, strength, and a periodic body-composition trend — gives a fuller picture than the scale alone, and tends to be kinder to motivation.",
        "This article is educational and is not medical advice. For an accurate assessment of your health, consult a qualified healthcare provider.",
      ].join("\n\n"),
    },
    es: {
      title: "Leer tus números de composición corporal",
      excerpt:
        "El peso es una señal entre muchas. Cómo pensar en la composición corporal sin obsesionarte con la báscula.",
      body: [
        "La báscula mide una sola cosa: la masa total. No distingue músculo de grasa ni de agua, por eso el peso puede variar de un día a otro por razones que nada tienen que ver con el progreso — hidratación, sodio, sueño y los ritmos normales del cuerpo.",
        "Las herramientas de composición corporal estiman qué parte de tu peso es grasa frente a tejido magro. Los dispositivos caseros dan tendencias más que precisión clínica, así que el patrón a lo largo de las semanas importa mucho más que una sola lectura.",
        "Combinar varias señales — cómo te queda la ropa, la energía, la fuerza y una tendencia periódica de composición corporal — ofrece un panorama más completo que la báscula sola, y suele ser más amable con la motivación.",
        "Este artículo es educativo y no constituye consejo médico. Para una evaluación precisa de tu salud, consulta a un proveedor de salud calificado.",
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

  // Health-education articles (EN + ES) that power the /learn magazine. Content
  // is deliberately educational and LegitScript-safe — no diagnosis, treatment,
  // or cure claims — with an author + medical-reviewer byline for trust. The
  // reviewer name is a placeholder until a clinician signs off (task 40); swap
  // it, don't remove it. Editable from the admin Blog & Articles editor.
  for (const [i, a] of ARTICLES.entries()) {
    for (const locale of ["en", "es"] as const) {
      const article = {
        slug: a.slug,
        locale,
        title: a[locale].title,
        excerpt: a[locale].excerpt,
        body: a[locale].body,
        category: a.category,
        author_name: "Saludlink Editorial",
        // NO medical reviewer: these articles are written and cited, not
        // clinician-reviewed. Displaying "medically reviewed by …" without an
        // actual reviewer would be deceptive. Sources are cited in the body.
        reviewer_name: null,
        reviewer_credentials: null,
        reviewed_at: null,
        status: "published",
        // Spread publish dates so the magazine has a natural recency order.
        published_at: `2026-07-${String(22 - i).padStart(2, "0")}`,
      }

      const [existing] = await service.listArticles({
        slug: a.slug,
        locale,
      })
      if (existing) {
        if (!force) continue
        await service.updateArticles({ id: existing.id, ...article })
        updated++
        continue
      }
      await service.createArticles(article)
      created++
    }
  }

  // Site settings
  await service.upsertSetting(
    "contact",
    {
      legalEntity: "Saludlink, Inc.",
      addressLine: "27230 US-290, Suite 700",
      city: "Cypress",
      state: "TX",
      zip: "77433",
      phone: "(713) 907-0133",
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
