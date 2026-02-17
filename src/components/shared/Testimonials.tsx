interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
  alignment?: number; // 0-100 percentage
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "The daily check-ins have become my morning ritual. It's like having a wise friend who sees patterns I can't see myself.",
    author: "Sarah M.",
    role: "Yoga Instructor",
    alignment: 72
  },
  {
    quote: "As a therapist, I've found the personality breakdown invaluable for understanding my clients. It adds a dimension to my practice I didn't know was missing.",
    author: "Dr. James L.",
    role: "Clinical Psychologist",
    alignment: 68
  },
  {
    quote: "This helped me through my toughest reset phase. The framing made my struggle feel meaningful rather than pointless.",
    author: "Alex K.",
    role: "Writer",
    alignment: 64
  },
  {
    quote: "I love the data-driven clarity. No fluff, just insights I can act on.",
    author: "Marcus T.",
    role: "Startup Founder",
    alignment: 71
  },
  {
    quote: "I was skeptical at first, but tracking my dimensions over time revealed patterns I was completely blind to. Game-changing.",
    author: "Elena R.",
    role: "Product Designer",
    alignment: 67
  },
  {
    quote: "The daily reading helps me plan my week. I schedule creative work on high-Heart days and admin on high-Structure days.",
    author: "Jordan P.",
    role: "Creative Director",
    alignment: 73
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
          What People Are Saying
        </h2>
        <p className="text-[#f0e8d8]/60 text-sm">
          Join thousands exploring their energy patterns
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
              {testimonial.alignment && (
                <div className="text-right">
                  <div className="text-[#d4a854] text-xs font-mono">{testimonial.alignment}% aligned</div>
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
          <div className="text-2xl md:text-3xl font-serif text-[#d4a854]">67%</div>
          <div className="text-[#f0e8d8]/50 text-xs">Avg. alignment improvement</div>
        </div>
      </div>
    </section>
  );
}
