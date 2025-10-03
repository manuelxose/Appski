/**
 * Premium Page Models
 * Types and interfaces for premium subscription features
 */

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: "month" | "year";
  description: string;
  features: string[];
  highlighted: boolean;
  ctaText: string;
  badge?: string;
  savings?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  open: boolean;
  category?: "general" | "billing" | "features" | "support";
}

export interface Benefit {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
  rating: number;
}

export interface TrustBadge {
  id: string;
  text: string;
  icon: string;
}

export interface PremiumPageData {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaText: string;
  };
  benefits: Benefit[];
  plans: PricingPlan[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  trustBadges: TrustBadge[];
  finalCta: {
    title: string;
    description: string;
    ctaText: string;
  };
}
