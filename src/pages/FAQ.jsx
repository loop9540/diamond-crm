import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'How do I get started as a reseller?',
        a: "Simply click the 'Get Started' button, complete our quick onboarding form, and you'll receive access to all training materials, product photos, descriptions, and guidelines within 24 hours. We'll guide you through setting up your Facebook Marketplace presence step by step."
      },
      {
        q: 'Do I need to invest money upfront?',
        a: "No initial inventory investment is required. You'll be selling on behalf of our established business. We handle inventory, storage, and shipping. You focus on sales and customer relationships in your local market."
      },
      {
        q: 'Can I sell in my own location/region?',
        a: "Yes! That's the beauty of this model. You sell on your own Facebook profile in your own location, building relationships with local customers while being part of our proven business system."
      },
      {
        q: 'Can I use other platforms besides Facebook Marketplace?',
        a: "While we've proven success on Facebook Marketplace, you're welcome to explore other platforms once you're comfortable with the process. We'll discuss best practices for expanding your reach."
      },
    ]
  },
  {
    category: 'Payment & Commission',
    items: [
      {
        q: 'How do I receive payment and commissions?',
        a: "You'll collect payment directly from customers through secure methods we'll teach you. Your commission structure will be explained during onboarding, with competitive margins that reward your sales efforts."
      },
      {
        q: 'What is your commission?',
        a: "For $525 sale — $75\nFor $660 sale — $100\nFor $950 sale — $150\nFor $1,700 sale — $300"
      },
      {
        q: 'Where do I send the payment after I sell a pair of earrings?',
        a: "After you collect payment from the customer, you send the agreed amount to us via e-transfer to: ohadandco@gmail.com"
      },
      {
        q: 'Can we collect cash for a sale?',
        a: "Yes, we can sell our product for cash. Please contact me when this happens and I'll provide instructions."
      },
      {
        q: 'How do you handle low offers?',
        a: "Here's the polite and professional message to use:\n\"Thank you [customer name] for your offer. However, I will pass on it 🙏.\"\n\nYou can also offer alternatives, such as:\n• 1ct for $525\n• 1.5ct for $660\n• 2ct for $950"
      },
    ]
  },
  {
    category: 'Product Information',
    items: [
      {
        q: 'Are the diamonds authentic?',
        a: "Yes. All our diamond earrings 2 carats total weight and above come with appraisals and quality guarantees. We've built a strong reputation over the past year for providing genuine, high-quality pieces."
      },
      {
        q: "Why don't the smaller diamond earrings (1ct & 1.5ct) come with certificates?",
        a: "Smaller sets usually don't include a certificate or appraisal because obtaining one typically costs over $100, and we aim to keep prices affordable. Buyers are always welcome to have them certified independently, or I can arrange certification for an additional fee."
      },
      {
        q: 'Do you offer certified diamond earrings?',
        a: "Yes, we do. Certification is available upon request. It does cost more than the regular price because third-party labs are involved in the grading process. For an exact quote, please contact me directly."
      },
      {
        q: 'What kind of setting do you use?',
        a: "All our earrings are set in 14K solid gold with secure screw-back posts. This provides extra safety, comfort, and durability, making them ideal for everyday wear."
      },
      {
        q: 'Can I get regular push-back earrings instead of screw-backs?',
        a: "Yes, of course. We can provide standard push-back posts. This usually takes 1–3 business days to prepare."
      },
      {
        q: "What is your measurements size/thickness of the earring's posts?",
        a: "Posts usually come in 4 different sizes: 0.70mm, 0.80mm, 0.90mm, 1mm. We use 0.80mm."
      },
      {
        q: 'Do you carry larger earrings, more than 2ct total weight?',
        a: "Yes, absolutely. We have bigger options available. For example, 3ct total weight in the same style usually starts around $1,700. Message me and I'll provide exact details and options."
      },
      {
        q: 'Where do your diamonds and earrings come from?',
        a: "We work with a professional goldsmith who custom-makes our jewelry. Our loose diamonds are sourced directly from trusted overseas suppliers."
      },
      {
        q: 'Can I see the diamonds in person before buying?',
        a: "Yes. We can meet at any jewelry store or appraisal office so you can view and authenticate the piece before purchasing."
      },
      {
        q: 'If a customer lost one earring or backing, what can we do?',
        a: "We can sell them an individual stud that will match the one they have at half price. We can also sell a single backing if needed.\n\n$45 — 0.50ct each\n$50 — 0.75ct each\n$60 — 1ct each"
      },
    ]
  },
  {
    category: 'Sales & After Sale',
    items: [
      {
        q: 'After I sell a pair of earrings, what should I do?',
        a: "Let me know which item you sold and I will update inventory. Kindly ask the buyer for a review. Then create a new listing right away with the updated details for the next pair. If you need any information — such as a new appraisal — feel free to contact me and I will ship a new pair to you."
      },
      {
        q: 'What if a customer has a problem or wants a return?',
        a: "We have clear return and customer service policies that you'll learn during training. For most cases we can return within 30 days and receive a full refund. For any issues, our support team is available to help you handle customer concerns professionally and maintain satisfaction."
      },
      {
        q: 'Can we sell other jewelry?',
        a: "Of course! Please share with me details of what the customer wants, and we will make it happen. For custom made we will need 50% deposit up front."
      },
    ]
  },
  {
    category: 'Support & Shipping',
    items: [
      {
        q: 'What kind of support will I receive?',
        a: "You'll get comprehensive training materials, professional product photos, optimized descriptions, FAQ responses for customers, ongoing support from our team, and access to a private reseller community for sharing tips and experiences."
      },
      {
        q: 'How do I handle shipping?',
        a: "We coordinate all shipping and logistics. You'll simply need to collect shipping information from customers and pass it along to us. We ensure safe, tracked delivery to maintain our quality standards."
      },
      {
        q: 'How quickly do you respond to messages?',
        a: "I usually reply within minutes to an hour. I keep communication fast, clear, and professional so you always get the information you need right away."
      },
      {
        q: 'Do you provide additional photos or videos if requested?',
        a: "Yes. I can send clear videos, close-up photos, or comparison shots so you can see exactly what you're buying before making a decision."
      },
      {
        q: 'What is your communication style?',
        a: "Always polite, respectful, and straightforward. I'm here to make the process easy, answer questions honestly, and help you feel confident with your purchase."
      },
      {
        q: 'How do you create credibility?',
        a: "We are an authorized reseller partner of MyDiamondsShop.com and work directly within the jewelry industry. All of our pieces are professionally made, carefully inspected, and we stand behind the quality of every item we sell."
      },
    ]
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button className="w-full flex items-center justify-between py-4 px-1 text-left" onClick={() => setOpen(!open)}>
        <span className="text-sm font-medium text-gray-900 pr-4">{q}</span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-sm text-gray-600 pb-4 px-1 whitespace-pre-line leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <div>
      <h1 className="text-4xl mb-6">FAQ</h1>
      <div className="flex flex-col gap-4">
        {faqs.map(section => (
          <div key={section.category} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-2">{section.category}</h2>
            {section.items.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
