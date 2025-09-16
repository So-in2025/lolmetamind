#!/bin/bash

# ==============================================================================
# SCRIPT DE AUTOMATIZACIÓN PARA LA FASE 6 DE LOL METAMIND
#
# Rol: Arquitecto de Frontend
# Objetivo: Crear las páginas legales requeridas por Paddle para la verificación.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la creación de páginas legales para la verificación de Paddle...${NC}"

# --- 1. Crear directorios necesarios ---
mkdir -p src/app/terms
mkdir -p src/app/privacy
mkdir -p src/app/refunds

# --- 2. Crear página de Términos de Servicio ---
echo -e "\n${CYAN}Creando página de Términos de Servicio...${NC}"
cat << 'EOF' > src/app/terms/page.jsx
const LegalPageLayout = ({ title, children }) => (
    <div className="min-h-screen bg-lol-blue-dark text-lol-gold-light font-body p-8">
        <div className="max-w-4xl mx-auto bg-lol-blue-medium p-8 rounded-lg border-2 border-lol-gold-dark">
            <h1 className="text-4xl font-display text-lol-blue-accent mb-6">{title}</h1>
            <div className="space-y-4 text-lol-gold-light/90">{children}</div>
        </div>
    </div>
);

export default function TermsOfServicePage() {
    return (
        <LegalPageLayout title="Términos de Servicio">
            <p>Última actualización: 16 de Septiembre de 2025</p>
            <p>Bienvenido a LoL MetaMind. Al utilizar nuestros servicios, usted acepta estar sujeto a los siguientes términos y condiciones. Por favor, léalos cuidadosamente.</p>
            
            <h2 className="text-2xl font-display text-lol-gold pt-4">Uso de la Cuenta</h2>
            <p>Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. Se compromete a aceptar la responsabilidad de todas las actividades que ocurran bajo su cuenta.</p>

            <h2 className="text-2xl font-display text-lol-gold pt-4">Suscripciones</h2>
            <p>Ofrecemos un plan gratuito y un plan Premium. El plan Premium se factura de forma mensual recurrente. Puede cancelar su suscripción en cualquier momento, pero no se realizarán reembolsos por el período de facturación actual.</p>

            <h2 className="text-2xl font-display text-lol-gold pt-4">Propiedad Intelectual</h2>
            <p>El servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de SO-IN Soluciones Informáticas y sus licenciantes.</p>
        </LegalPageLayout>
    );
}
EOF

# --- 3. Crear página de Política de Privacidad ---
echo -e "${CYAN}Creando página de Política de Privacidad...${NC}"
cat << 'EOF' > src/app/privacy/page.jsx
const LegalPageLayout = ({ title, children }) => (
    <div className="min-h-screen bg-lol-blue-dark text-lol-gold-light font-body p-8">
        <div className="max-w-4xl mx-auto bg-lol-blue-medium p-8 rounded-lg border-2 border-lol-gold-dark">
            <h1 className="text-4xl font-display text-lol-blue-accent mb-6">{title}</h1>
            <div className="space-y-4 text-lol-gold-light/90">{children}</div>
        </div>
    </div>
);

export default function PrivacyPolicyPage() {
    return (
        <LegalPageLayout title="Política de Privacidad">
            <p>Última actualización: 16 de Septiembre de 2025</p>
            <p>Su privacidad es importante para nosotros. Es política de LoL MetaMind respetar su privacidad con respecto a cualquier información que podamos recopilar de usted a través de nuestro sitio web.</p>
            
            <h2 className="text-2xl font-display text-lol-gold pt-4">Información que recopilamos</h2>
            <p>Recopilamos información personal como nombre, dirección de correo electrónico y datos de juego (nombre de invocador) solo cuando es estrictamente necesario para proporcionar un servicio. Lo hacemos por medios justos y legales, con su conocimiento y consentimiento.</p>

            <h2 className="text-2xl font-display text-lol-gold pt-4">Uso de datos</h2>
            <p>Utilizamos los datos recopilados para operar y mantener los servicios de la plataforma, procesar pagos de suscripción y comunicarnos con usted. No compartimos ninguna información de identificación personal públicamente o con terceros, excepto cuando lo exija la ley.</p>
        </LegalPageLayout>
    );
}
EOF

# --- 4. Crear página de Política de Reembolso ---
echo -e "${CYAN}Creando página de Política de Reembolso...${NC}"
cat << 'EOF' > src/app/refunds/page.jsx
const LegalPageLayout = ({ title, children }) => (
    <div className="min-h-screen bg-lol-blue-dark text-lol-gold-light font-body p-8">
        <div className="max-w-4xl mx-auto bg-lol-blue-medium p-8 rounded-lg border-2 border-lol-gold-dark">
            <h1 className="text-4xl font-display text-lol-blue-accent mb-6">{title}</h1>
            <div className="space-y-4 text-lol-gold-light/90">{children}</div>
        </div>
    </div>
);

export default function RefundPolicyPage() {
    return (
        <LegalPageLayout title="Política de Reembolso">
            <p>Última actualización: 16 de Septiembre de 2025</p>
            <p>Para nuestros planes de suscripción Premium, ofrecemos una garantía de satisfacción.</p>
            <p>Si no está satisfecho con el servicio, puede solicitar un reembolso completo dentro de los primeros 7 días de su primer período de suscripción. Las solicitudes de reembolso realizadas después de este período de 7 días no serán elegibles.</p>
            <p>Para solicitar un reembolso, por favor contacte a nuestro equipo de soporte en soporte@soin.com con los detalles de su compra.</p>
        </LegalPageLayout>
    );
}
EOF

echo -e "\n${GREEN}¡Páginas legales creadas con éxito!${NC}"
echo -e "${YELLOW}----------------------------------------------------------------------${NC}"
echo -e "Ahora, sube los cambios a GitHub para que Vercel los despliegue."
echo -e "${CYAN}git add . && git commit -m \"feat: Agrega páginas legales\" && git push${NC}"