import React from "react"
import { CreditCard, RotateCcw, Shirt, Store, Truck, UserRound } from "lucide-react"

export const metadata = {
  title: "Help & Customer Service",
  description:
    "Get help with orders, delivery, returns, refunds, payments and your Bacoola account, or find out how to contact our customer service team.",
}

const helpCategories = [
  {
    title: "Delivery and order tracking",
    href: "#delivery",
    icon: Truck,
  },
  {
    title: "Returns, exchanges and refunds",
    href: "#returns",
    icon: RotateCcw,
  },
  {
    title: "Payments and promotions",
    href: "#payments",
    icon: CreditCard,
  },
  {
    title: "Information on sizes and products",
    href: "#sizes",
    icon: Shirt,
  },
  {
    title: "Personal data and notifications",
    href: "#personal-data",
    icon: UserRound,
  },
  {
    title: "Stores",
    href: "#stores",
    icon: Store,
  },
]

const faqs = [
  "Where is my order?",
  "How can I exchange or return an online purchase?",
  "How and when will I receive my refund?",
  "Why do we need your KYC to send you the order?",
]

export default function HelpPage() {
  return (
    <div className="w-full bg-white text-[#111111] font-sans">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 xl:px-10 pt-16 pb-32 flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] mb-4">
            Help
          </h1>
          <p className="text-[12px] lg:text-[14px] font-normal tracking-wide">
            Hello, how can we help you?
          </p>
        </div>

        {/* FAQs */}
        <div className="w-full max-w-[900px] mb-20">
          <h2 className="text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] mb-8">
            Frequently Asked Questions
          </h2>
          <ul className="flex flex-col gap-y-6">
            {faqs.map((question, index) => (
              <li key={index}>
                <a
                  href="#"
                  className="text-[12px] lg:text-[14px] font-normal tracking-wide hover:text-[#555555] transition-colors"
                >
                  {question}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div className="w-full max-w-[900px]">
          <h2 className="text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] mb-6">
            Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 border-l border-t border-gray-200">
            {helpCategories.map((category, index) => {
              const Icon = category.icon
              return (
                <a
                  key={index}
                  href={category.href}
                  className="flex flex-col items-center justify-center text-center p-8 border-r border-b border-gray-200 hover:bg-gray-50 transition-colors aspect-[4/3]"
                >
                  <Icon className="w-5 h-5 stroke-[1.2px] mb-4 text-[#111111]" />
                  <span className="text-[12px] lg:text-[14px] font-normal tracking-wide">
                    {category.title}
                  </span>
                </a>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
