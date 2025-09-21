import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does the AI sentiment analysis work?",
      answer: "Our AI uses advanced natural language processing to analyze the emotional tone, sentiment, and key themes in customer reviews. It provides real-time scoring and insights to help you understand customer satisfaction levels."
    },
    {
      question: "Can I customize the AI-generated responses?",
      answer: "Yes! You can customize the tone, style, and content of AI-generated responses. You can also create custom templates and set specific guidelines for your brand voice."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade encryption, secure API connections, and comply with industry security standards. Your data is never shared with third parties without your explicit consent."
    },
    {
      question: "Can I integrate with other tools?",
      answer: "Yes, our Professional and Enterprise plans include API access for seamless integration with your existing CRM, marketing tools, and business systems."
    },
    {
      question: "What happens if I exceed my plan limits?",
      answer: "We'll notify you when you're approaching your limits and offer upgrade options. We never cut off your service - we work with you to find the right solution."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes! You can try our demo with sample data to explore all features, or start with our Starter plan and upgrade anytime as your business grows."
    },
    {
      question: "Which data do you fetch from Google?",
      answer: "We fetch all publicly available review data from your Google Business Profile, including review text, ratings, author information, timestamps, and response status. We also collect performance metrics like impressions, clicks, and customer actions. All data is retrieved through official Google APIs with proper authentication."
    },
    {
      question: "Do you support multiple business locations?",
      answer: "Yes! Our Professional and Enterprise plans support multiple business locations. You can manage all your locations from a single dashboard, compare performance across locations, and get consolidated insights. The Starter plan includes 1 location, Professional supports up to 5 locations, and Enterprise offers unlimited locations."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="py-20 bg-gradient-to-br from-gray-50 to-blue-50"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked{" "}
            <span className="text-blue-600">
              Questions
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Got questions? We've got answers. If you can't find what you're
            looking for, feel free to contact our support team.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openIndex === index ? (
                      <ChevronUpIcon className="w-6 h-6 text-blue-600" />
                    ) : (
                      <ChevronDownIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </button>

                {openIndex === index && (
                  <div className="px-8 pb-6">
                    <div className="border-t border-gray-100 pt-6">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our support team is here to help you get the most out of
              ReviewLip. Reach out anytime and we'll get back to you
              quickly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300">
                Contact Support
              </button>
              <button className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-300">
                Schedule a Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
