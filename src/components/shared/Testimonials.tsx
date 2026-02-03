interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
  kappa?: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "The daily check-ins have become my morning ritual. It's like having a wise friend who sees patterns I can't see myself.",
    author: "Sarah M.",
    role: "Yoga Instructor",
    kappa: 0.72
  },
  {
    quote: "As a therapist, I've found the 16D framework invaluable for understanding my clients. It adds a dimension to my practice I didn't know was missing.",
    author: "Dr. James L.",
    role: "Clinical Psychologist",
    kappa: 0.68
  },
  {
    quote: "River's voice helped me through my darkest nigredo. The alchemical framing made my struggle feel meaningful rather than pointless.",
    author: "Alex K.",
    role: "Writer",
    kappa: 0.64
  },
  {
    quote: "Kasra mode gives me the data-driven clarity I need. No fluff, just insights I can act on.",
    author: "Marcus T.",
    role: "Startup Founder",
    kappa: 0.71
  },
  {
    quote: "I was skeptical at first, but tracking my dimensions over time revealed patterns I was completely blind to. Game-changing.",
    author: "Elena R.",
    role: "Product Designer",
    kappa: 0.67
  },
  {
    quote: "The cosmic weather feature helps me plan my week. I schedule creative work on high-V days and admin on high-E days.",
    author: "Jordan P.",
    role: "Creative Director",
    kappa: 0.73
  }
];

interface TestimonialsProps {
  className?: string;
  limit?: number;
}

export function Testimonials({ className = '', limit = 3 }: TestimonialsProps) {
  const displayed = TESTIMONIALS.slice(0, limit);

  return (
    <section className={`py-12 ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-serif text-[#f0e8d8] mb-2">
          Voices from the Field
        </h2>
        <p className="text-[#f0e8d8]/60 text-sm">
          Join thousands exploring their cosmic signatures
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
        {displayed.map((testimonial, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-[rgba(212,168,84,0.1)] bg-[rgba(26,24,20,0.4)] hover:border-[rgba(212,168,84,0.25)] transition-colors"
          >
            <div className="text-[#d4a854] text-2xl mb-4">"</div>
            <p className="text-[#f0e8d8]/80 text-sm leading-relaxed mb-4">
              {testimonial.quote}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#f0e8d8] text-sm font-medium">{testimonial.author}</div>
                <div className="text-[#f0e8d8]/50 text-xs">{testimonial.role}</div>
              </div>
              {testimonial.kappa && (
                <div className="text-right">
                  <div className="text-[#d4a854] text-xs font-mono">κ = {testimonial.kappa.toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8 md:gap-16 mt-12 px-4">
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-serif text-[#d4a854]">12,000+</div>
          <div className="text-[#f0e8d8]/50 text-xs">Check-ins completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-serif text-[#d4a854]">2,400+</div>
          <div className="text-[#f0e8d8]/50 text-xs">Active explorers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-serif text-[#d4a854]">0.67</div>
          <div className="text-[#f0e8d8]/50 text-xs">Avg. κ improvement</div>
        </div>
      </div>
    </section>
  );
}
