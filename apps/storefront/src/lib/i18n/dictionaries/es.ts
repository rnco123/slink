/**
 * Spanish (US Spanish) dictionary — mirrors the shape of en.ts (the source of truth).
 * Keep keys stable; add new copy in en.ts first. No unsupported health claims (LegitScript).
 */
const es = {
  common: {
    startVisit: "Iniciar una consulta",
    shopProducts: "Comprar productos",
    exploreTelehealth: "Explorar la telesalud",
    account: "Cuenta",
    cart: "Carrito",
    allProducts: "Todos los productos",
    readGuides: "Leer las guías",
    learnMore: "Más información",
    explore: "Explorar",
    emergency: "En caso de emergencia, llame al 911.",
  },
  nav: {
    ticker: "Envío gratis en pedidos de más de $49 · Con respaldo clínico · Elegible para HSA/FSA",
    shop: "Tienda",
    conditions: "Condiciones",
    telehealth: "Telesalud",
    learn: "Aprender",
    about: "Nosotros",
  },
  home: {
    metaTitle: "Salud metabólica, cuidada con dedicación",
    metaDescription:
      "Saludlink combina productos para el control de peso y la salud metabólica con respaldo clínico y atención de telesalud conectada. Con base en evidencia, precios transparentes y entrega a domicilio.",
    heroEyebrow: "Control de peso y salud metabólica",
    heroTitleLine1: "Salud metabólica,",
    heroTitleAccent: "cuidada con dedicación.",
    heroBody:
      "Productos con base en evidencia y atención de telesalud conectada: seleccionados junto a profesionales clínicos, con precios transparentes y entrega a domicilio.",
    heroReassurance: "Elegible para HSA/FSA · Envío gratis en pedidos de más de $49 · Devoluciones en 30 días",
    trust: {
      a: "Con respaldo clínico",
      aLabel: "en la selección de productos",
      b: "Precios",
      bLabel: "siempre transparentes",
      c: "HSA/FSA",
      cLabel: "elegible",
      d: "Envío gratis",
      dLabel: "en pedidos de más de $49",
    },
    conditionsEyebrow: "Compra según tu necesidad",
    conditionsTitle: "Encuentra lo que se ajusta a tus metas de salud",
    conditionsBody:
      "Productos seleccionados y organizados en torno a los resultados que importan para el control de peso y la salud metabólica.",
    howEyebrow: "Cómo funciona",
    howTitle: "Un camino más simple hacia la salud metabólica",
    steps: [
      {
        t: "Elige con confianza",
        d: "Explora productos seleccionados con aporte clínico y descritos con honestidad, sin exageraciones ni afirmaciones sin respaldo.",
      },
      {
        t: "Conéctate con la atención",
        d: "¿Necesitas orientación? Inicia una consulta de telesalud con un proveedor con licencia a través de nuestro servicio de atención conectada.",
      },
      {
        t: "Mantén el rumbo",
        d: "Suscríbete para reabastecerte de forma automática y monitorea tu progreso con herramientas para usar en casa.",
      },
    ],
    careEyebrow: "Atención conectada",
    careTitle: "Habla con un proveedor con licencia",
    careBody:
      "Nuestro servicio de telesalud te conecta con profesionales clínicos para la atención del peso y la salud metabólica. Disponible en estados selectos: verifica la disponibilidad antes de comenzar.",
    careCta2: "Cómo funciona la telesalud",
  },
  conditions: {
    metaTitle: "Condiciones de salud y categorías",
    metaDescription:
      "Explora Saludlink según tu meta de salud: control de peso, salud metabólica, nutrición y monitoreo. Productos seleccionados con atención de telesalud conectada.",
    eyebrow: "Compra según tu necesidad",
    title: "Categorías de salud",
    body: "Todo lo que ofrecemos está organizado en torno a los resultados que importan para el control de peso y la salud metabólica.",
    verticals: {
      "weight-management": {
        label: "Control de peso",
        blurb: "Apoyo con base en evidencia para un cambio de peso sostenible.",
      },
      "metabolic-health": {
        label: "Salud metabólica",
        blurb: "Azúcar en sangre, energía y marcadores metabólicos.",
      },
      nutrition: {
        label: "Nutrición y apoyo alimenticio",
        blurb: "Proteína, fibra y bases nutricionales para el día a día.",
      },
      monitoring: {
        label: "Monitoreo y dispositivos",
        blurb: "Básculas, monitores y herramientas de seguimiento para usar en casa.",
      },
    },
  },
  telemedicine: {
    metaTitle: "Telesalud para el control de peso y la salud metabólica",
    metaDescription:
      "Conéctate con proveedores con licencia para la atención del peso y la salud metabólica a través del servicio de telemedicina de Saludlink. Descubre cómo funciona y verifica la disponibilidad por estado.",
    heroTitle: "Telesalud con licencia para el control de peso y la salud metabólica",
    heroBody:
      "Reúnete desde casa con profesionales clínicos enfocados en la salud metabólica. La atención se brinda a través de nuestro servicio seguro de telesalud y está disponible en estados selectos.",
    checkAvailability: "Verificar disponibilidad por estado",
    howTitle: "Cómo funciona",
    steps: [
      { t: "Verifica la disponibilidad", d: "Confirma que la telesalud se ofrece en tu estado." },
      {
        t: "Inicia tu consulta",
        d: "Crea una cuenta y completa un breve cuestionario de admisión en la aplicación de telesalud.",
      },
      { t: "Conoce a tu proveedor", d: "Conéctate por video seguro con un profesional clínico con licencia." },
      {
        t: "Sigue tu plan",
        d: "Recibe orientación y, cuando corresponda, pide productos de apoyo.",
      },
    ],
    availabilityTitle: "Dónde está disponible la telesalud",
    availabilityBody:
      "Los servicios de telesalud se ofrecen únicamente en los estados donde nuestros proveedores tienen licencia. Esta lista se actualiza a medida que crecemos.",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      {
        question: "¿Cómo funciona una consulta de telesalud de Saludlink?",
        answer:
          "Inicias una consulta a través de nuestro servicio de telesalud conectado, completas un breve cuestionario de admisión y te reúnes con un proveedor con licencia por video seguro. Si la atención es apropiada, el proveedor conversará contigo sobre los siguientes pasos.",
      },
      {
        question: "¿En qué estados está disponible la telesalud?",
        answer:
          "La telesalud está disponible únicamente en los estados donde nuestros proveedores tienen licencia. Consulta la tabla de disponibilidad por estado en esta página para ver la lista actual.",
      },
      {
        question: "¿Es esto un sustituto de la atención de emergencia?",
        answer:
          "No. La telesalud no es para emergencias. Si tienes una emergencia médica, llama al 911 o acude a la sala de emergencias más cercana.",
      },
      {
        question: "¿Necesito seguro médico?",
        answer:
          "No. Las consultas se pueden pagar de tu bolsillo, y muchas son elegibles para HSA/FSA. Los detalles de cobertura se muestran antes de comenzar.",
      },
    ],
  },
  availability: {
    state: "Estado",
    telehealth: "Telesalud",
    shipping: "Envío de productos",
    available: "Disponible",
    notYet: "Aún no",
  },
  footer: {
    shop: "Tienda",
    company: "Empresa",
    legal: "Legal",
    contact: "Contacto",
    certificationPending: "Certificación pendiente",
    disclaimer:
      "La información proporcionada por Saludlink tiene únicamente fines educativos y no sustituye el consejo, diagnóstico o tratamiento médico profesional. Las declaraciones relacionadas con los suplementos dietéticos no han sido evaluadas por la FDA y no tienen la intención de diagnosticar, tratar, curar ni prevenir ninguna enfermedad. Consulte siempre a un proveedor de atención médica calificado. En caso de emergencia, llame al 911.",
    rights: "Todos los derechos reservados.",
    statesNote: "Servicios disponibles únicamente en los estados indicados:",
    seeAvailability: "ver disponibilidad por estado",
  },
  about: {
    metaTitle: "Acerca de Saludlink",
    metaDescription:
      "Saludlink reúne productos de salud con respaldo clínico y atención de telesalud conectada para el control de peso y la salud metabólica: con transparencia y honestidad.",
    eyebrow: "Nuestra misión",
    title: "Salud honesta y accesible",
    intro:
      "Saludlink existe para hacer más sencillo el control del peso y la salud metabólica. Combinamos productos cuidadosamente seleccionados con atención de telesalud conectada, y describimos todo lo que vendemos con honestidad: sin exageraciones ni afirmaciones sin respaldo.",
    believeTitle: "En qué creemos",
    beliefs: [
      {
        t: "La transparencia primero.",
        d: "Precios claros, origen claro e información clara sobre lo que un producto hace y lo que no hace.",
      },
      {
        t: "Con respaldo clínico.",
        d: "Nuestro catálogo se elabora con aporte clínico, y la atención la brindan proveedores con licencia.",
      },
      {
        t: "Privacidad por diseño.",
        d: "Protegemos tus datos de salud y mantenemos los registros clínicos separados de nuestra tienda.",
      },
    ],
    whoTitle: "Quiénes somos",
    whoBody:
      "Saludlink, Inc. es una empresa de salud y bienestar. Los datos de liderazgo y titularidad se publicarán aquí para plena transparencia.",
  },
  contact: {
    metaTitle: "Contáctanos",
    metaDescription:
      "Comunícate con el equipo de Saludlink para obtener soporte, resolver dudas sobre tu pedido o realizar solicitudes de accesibilidad y privacidad.",
    eyebrow: "Estamos para ayudarte",
    title: "Contacta a Saludlink",
    intro:
      "En caso de emergencia médica, llame al 911. Nuestro equipo de soporte está disponible para todo lo demás.",
    supportTitle: "Atención al cliente",
    supportBody: "Pedidos, productos, devoluciones.",
    addressTitle: "Dirección postal",
    privacyNote: "Solicitudes de privacidad:",
    accessibilityNote: "Accesibilidad:",
  },
  licensing: {
    metaTitle: "Licencias y disponibilidad por estado",
    metaDescription:
      "Dónde están disponibles la telesalud y el envío de productos de Saludlink, e información sobre nuestras licencias y supervisión médica.",
    eyebrow: "Transparencia",
    title: "Licencias y disponibilidad por estado",
    intro:
      "Saludlink, Inc. ofrece productos de salud y bienestar en todo el país donde el envío está disponible, y servicios de telesalud únicamente en los estados donde nuestros proveedores afiliados cuentan con licencia. La siguiente tabla muestra la disponibilidad actual. La actualizamos a medida que ampliamos la cobertura.",
    oversightTitle: "Supervisión médica",
    oversightBody:
      "La atención de telesalud la brindan profesionales clínicos con licencia a través de nuestro servicio de telesalud conectado. La información sobre las licencias de los proveedores está disponible a solicitud.",
    businessTitle: "Información de la empresa",
    draftNote:
      "Esta página contiene datos de marcador de posición pendientes de la revisión final de cumplimiento. No es para emergencias: en caso de emergencia, llame al 911.",
  },
} as const

export default es
