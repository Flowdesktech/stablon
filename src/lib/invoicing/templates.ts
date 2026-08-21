export interface InvoiceTemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  primary: string;
  secondary: string;
  design:
    | "modern"
    | "minimalist"
    | "corporate"
    | "creative"
    | "elegant"
    | "fresh"
    | "classic"
    | "tech"
    | "bold"
    | "pastel"
    | "professional"
    | "luxury"
    | "startup"
    | "accounting"
    | "consulting";
  font: "sans" | "serif" | "mono";
  page: string;
  ink: string;
  muted: string;
  surface: string;
  border: string;
  headerBackground: string;
  headerForeground: string;
  tableHeaderBackground: string;
  tableHeaderForeground: string;
  totalBackground: string;
  totalForeground: string;
  rounded: boolean;
}

// Visual variants ported from Flowdesk Invoice's 15-template catalog. The
// preview and PDF renderers consume this single registry so they never drift.
export const INVOICE_TEMPLATES: InvoiceTemplateDefinition[] = [
  { id: "modern-blue", name: "Modern Blue", description: "Clean and professional with blue accents", category: "Modern", primary: "#2563eb", secondary: "#3b82f6", design: "modern", font: "sans", page: "#ffffff", ink: "#1e293b", muted: "#64748b", surface: "#f8fafc", border: "#dbeafe", headerBackground: "#2563eb", headerForeground: "#ffffff", tableHeaderBackground: "#f8fafc", tableHeaderForeground: "#1e293b", totalBackground: "#eff6ff", totalForeground: "#2563eb", rounded: false },
  { id: "minimalist-gray", name: "Minimalist Gray", description: "Simple and elegant with subtle gray tones", category: "Minimalist", primary: "#2d3748", secondary: "#9ca3af", design: "minimalist", font: "sans", page: "#ffffff", ink: "#2d3748", muted: "#a0aec0", surface: "#ffffff", border: "#e2e8f0", headerBackground: "#ffffff", headerForeground: "#2d3748", tableHeaderBackground: "#ffffff", tableHeaderForeground: "#a0aec0", totalBackground: "#ffffff", totalForeground: "#2d3748", rounded: false },
  { id: "corporate-dark", name: "Corporate Dark", description: "Professional dark theme for enterprises", category: "Corporate", primary: "#111827", secondary: "#4b5563", design: "corporate", font: "sans", page: "#ffffff", ink: "#111827", muted: "#6b7280", surface: "#f9fafb", border: "#e5e7eb", headerBackground: "#111827", headerForeground: "#f3f4f6", tableHeaderBackground: "#111827", tableHeaderForeground: "#d1d5db", totalBackground: "#1f2937", totalForeground: "#ffffff", rounded: false },
  { id: "creative-orange", name: "Creative Orange", description: "Bold and creative with orange highlights", category: "Creative", primary: "#ea580c", secondary: "#fb923c", design: "creative", font: "sans", page: "#ffffff", ink: "#451a03", muted: "#92400e", surface: "#fff7ed", border: "#fed7aa", headerBackground: "#ea580c", headerForeground: "#ffffff", tableHeaderBackground: "#ffffff", tableHeaderForeground: "#92400e", totalBackground: "#ea580c", totalForeground: "#ffffff", rounded: true },
  { id: "elegant-purple", name: "Elegant Purple", description: "Sophisticated design with purple accents", category: "Elegant", primary: "#7c3aed", secondary: "#a78bfa", design: "elegant", font: "serif", page: "#ffffff", ink: "#1e1b4b", muted: "#6b21a8", surface: "#f3e8ff", border: "#ddd6fe", headerBackground: "#ffffff", headerForeground: "#7c3aed", tableHeaderBackground: "#f3e8ff", tableHeaderForeground: "#6b21a8", totalBackground: "#f3e8ff", totalForeground: "#7c3aed", rounded: true },
  { id: "fresh-green", name: "Fresh Green", description: "Nature-inspired with fresh green colors", category: "Modern", primary: "#16a34a", secondary: "#4ade80", design: "fresh", font: "sans", page: "#ffffff", ink: "#14532d", muted: "#15803d", surface: "#f0fdf4", border: "#bbf7d0", headerBackground: "#dcfce7", headerForeground: "#16a34a", tableHeaderBackground: "#16a34a", tableHeaderForeground: "#ffffff", totalBackground: "#dcfce7", totalForeground: "#14532d", rounded: true },
  { id: "classic-navy", name: "Classic Navy", description: "Traditional design with navy blue theme", category: "Classic", primary: "#1e293b", secondary: "#475569", design: "classic", font: "serif", page: "#ffffff", ink: "#0f172a", muted: "#475569", surface: "#f8fafc", border: "#cbd5e1", headerBackground: "#ffffff", headerForeground: "#1e293b", tableHeaderBackground: "#1e293b", tableHeaderForeground: "#ffffff", totalBackground: "#f8fafc", totalForeground: "#1e293b", rounded: false },
  { id: "tech-gradient", name: "Tech Gradient", description: "Modern gradient design for tech companies", category: "Tech", primary: "#6366f1", secondary: "#818cf8", design: "tech", font: "mono", page: "#ffffff", ink: "#1e1b4b", muted: "#6366f1", surface: "#eef2ff", border: "#c7d2fe", headerBackground: "#6366f1", headerForeground: "#ffffff", tableHeaderBackground: "#eef2ff", tableHeaderForeground: "#4338ca", totalBackground: "#6366f1", totalForeground: "#ffffff", rounded: true },
  { id: "bold-black-yellow", name: "Bold Contrast", description: "High contrast black and yellow design", category: "Bold", primary: "#000000", secondary: "#fbbf24", design: "bold", font: "sans", page: "#ffffff", ink: "#000000", muted: "#525252", surface: "#fefce8", border: "#000000", headerBackground: "#000000", headerForeground: "#fbbf24", tableHeaderBackground: "#fbbf24", tableHeaderForeground: "#000000", totalBackground: "#000000", totalForeground: "#fbbf24", rounded: false },
  { id: "soft-pastel", name: "Soft Pastel", description: "Gentle pastel colors for a softer look", category: "Soft", primary: "#6366f1", secondary: "#c7d2fe", design: "pastel", font: "serif", page: "#ffffff", ink: "#3730a3", muted: "#6366f1", surface: "#f5f3ff", border: "#e0e7ff", headerBackground: "#eef2ff", headerForeground: "#3730a3", tableHeaderBackground: "#f5f3ff", tableHeaderForeground: "#6366f1", totalBackground: "#eef2ff", totalForeground: "#3730a3", rounded: true },
  { id: "professional-teal", name: "Professional Teal", description: "Business-ready with teal accents", category: "Professional", primary: "#0d9488", secondary: "#14b8a6", design: "professional", font: "sans", page: "#ffffff", ink: "#134e4a", muted: "#0f766e", surface: "#f0fdfa", border: "#99f6e4", headerBackground: "#ffffff", headerForeground: "#0d9488", tableHeaderBackground: "#0d9488", tableHeaderForeground: "#ffffff", totalBackground: "#f0fdfa", totalForeground: "#0d9488", rounded: true },
  { id: "luxury-gold", name: "Luxury Gold", description: "Premium feel with gold highlights", category: "Luxury", primary: "#a16207", secondary: "#d97706", design: "luxury", font: "serif", page: "#fffbeb", ink: "#451a03", muted: "#92400e", surface: "#fffbeb", border: "#d97706", headerBackground: "#fffbeb", headerForeground: "#a16207", tableHeaderBackground: "#a16207", tableHeaderForeground: "#fffbeb", totalBackground: "#a16207", totalForeground: "#fffbeb", rounded: false },
  { id: "startup-pink", name: "Startup Pink", description: "Modern and energetic pink design", category: "Startup", primary: "#db2777", secondary: "#ec4899", design: "startup", font: "sans", page: "#ffffff", ink: "#831843", muted: "#be185d", surface: "#fdf2f8", border: "#fbcfe8", headerBackground: "#db2777", headerForeground: "#ffffff", tableHeaderBackground: "#fdf2f8", tableHeaderForeground: "#be185d", totalBackground: "#db2777", totalForeground: "#ffffff", rounded: true },
  { id: "accounting-blue", name: "Accounting Blue", description: "Traditional accounting firm style", category: "Accounting", primary: "#1e3a8a", secondary: "#2563eb", design: "accounting", font: "serif", page: "#ffffff", ink: "#1e3a8a", muted: "#1e40af", surface: "#f0f9ff", border: "#93c5fd", headerBackground: "#1e3a8a", headerForeground: "#ffffff", tableHeaderBackground: "#f0f9ff", tableHeaderForeground: "#1e3a8a", totalBackground: "#dbeafe", totalForeground: "#1e3a8a", rounded: false },
  { id: "consulting-gray", name: "Consulting Gray", description: "Professional consulting firm template", category: "Consulting", primary: "#374151", secondary: "#6b7280", design: "consulting", font: "sans", page: "#ffffff", ink: "#1f2937", muted: "#6b7280", surface: "#f9fafb", border: "#e5e7eb", headerBackground: "#f9fafb", headerForeground: "#1f2937", tableHeaderBackground: "#f3f4f6", tableHeaderForeground: "#374151", totalBackground: "#374151", totalForeground: "#ffffff", rounded: false },
];

export function getInvoiceTemplate(id: string): InvoiceTemplateDefinition {
  return INVOICE_TEMPLATES.find((template) => template.id === id) ?? INVOICE_TEMPLATES[0];
}
