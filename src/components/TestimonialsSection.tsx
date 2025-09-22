import { StarIcon, QuoteIcon } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "We increased customer satisfaction by 32% after using Dibiex. The sentiment alerts helped us respond faster to negative reviews and turn them into positive experiences.",
      author: "Sarah Johnson",
      role: "Marketing Director",
      company: "Bella Vista Restaurant",
      avatar: "https://github.com/yusufhilmi.png",
      rating: 5,
    },
    {
      quote:
        "The AI-powered insights revealed patterns we never noticed before. We discovered that customers loved our weekend brunch but had concerns about weekday service speed.",
      author: "Michael Chen",
      role: "Operations Manager",
      company: "Urban Café Chain",
      avatar: "https://github.com/kdrnp.png",
      rating: 5,
    },
    {
      quote:
        "Dibiex's competitor benchmarking feature showed us exactly where we stood in the market. We've improved our rating from 4.2 to 4.7 in just 3 months.",
      author: "Emily Rodriguez",
      role: "Business Owner",
      company: "Artisan Bakery Co.",
      avatar: "https://github.com/yahyabedirhan.png",
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-br from-[#2b394c]/5 via-white to-[#ecc00c]/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2b394c] mb-4">
            Trusted by{" "}
            <span className="text-[#2b394c]">
              Thousands of Businesses
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how businesses like yours are transforming their customer
            experience with Dibiex
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Quote Icon */}
              <div className="absolute -top-4 left-8">
                <div className="bg-gradient-to-r from-[#2b394c] to-[#ecc00c] rounded-full p-3">
                  <QuoteIcon className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-1 mb-6 mt-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </blockquote>

              {/* Author Info */}
              <div className="flex items-center space-x-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />

                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                  <div className="text-sm text-[#2b394c] font-medium">
                    {testimonial.company}
                  </div>
                </div>
              </div>

              {/* Hover Effect Background */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#2b394c]/10 to-[#ecc00c]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </div>
          ))}
        </div>

        {/* Social Proof Numbers */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                10,000+
              </div>
              <div className="text-gray-600">Businesses Trust Us</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">2.5M+</div>
              <div className="text-gray-600">Reviews Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">98%</div>
              <div className="text-gray-600">Customer Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">Support Available</div>
            </div>
          </div>
        </div>

        {/* Company Logos */}
        <div className="mt-16">
          <p className="text-center text-gray-500 mb-8">
            Trusted by businesses worldwide
          </p>
          <div className="flex items-center justify-center space-x-12 opacity-60 grayscale">
            {/* Placeholder logos - in a real implementation, these would be actual company logos */}
            <div className="bg-gray-300 h-12 w-24 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">COMPANY</span>
            </div>
            <div className="bg-gray-300 h-12 w-24 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">BRAND</span>
            </div>
            <div className="bg-gray-300 h-12 w-24 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                BUSINESS
              </span>
            </div>
            <div className="bg-gray-300 h-12 w-24 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">CORP</span>
            </div>
            <div className="bg-gray-300 h-12 w-24 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">GROUP</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
