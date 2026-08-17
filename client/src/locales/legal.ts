export const legalTranslations = {
  en: {
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "January 6, 2026",
      sections: [
        {
          id: "intro",
          title: "Introduction",
          content: `Welcome to LiLove. LiLove Teknoloji A.Ş. ("LiLove", "we", "us", or "our") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website or use our mobile application, and tell you about your privacy rights and how the law protects you.

This policy complies with the Turkish Personal Data Protection Law No. 6698 (KVKK) and the EU General Data Protection Regulation (GDPR) for our users in Turkey and the European Union respectively.`
        },
        {
          id: "controller",
          title: "1. Data Controller",
          content: `LiLove Teknoloji A.Ş. is the data controller responsible for your personal data.

**Company Information:**
- Company Name: LiLove Teknoloji A.Ş.
- Address: Levent Mahallesi, Büyükdere Caddesi No: 201, Şişli, İstanbul, Türkiye
- Email: privacy@lilove.org
- Phone: +90 212 999 00 00
- Website: https://lilove.org

**Data Protection Officer:**
For any inquiries regarding your personal data or this privacy policy, please contact our Data Protection Officer at privacy@lilove.org.`
        },
        {
          id: "collect",
          title: "2. Information We Collect",
          content: `We collect several types of information from and about users of our Service:

**Personal Information:**
- Name and display name
- Email address
- Profile picture and avatar customizations
- Username and password (encrypted)
- Date of birth (for age verification)
- Location data (optional, for personalization)

**OAuth Data:**
- Google OAuth: Email, name, profile picture
- Apple Sign-In: Email, name (optional)

**Usage Data:**
- Goals, tasks, and habits you create
- Progress tracking and completion data
- AI coach interactions and messages
- Analytics data (via PostHog)
- Performance metrics and app usage patterns
- Device type, operating system, browser information

**Device Information:**
- IP address
- Device identifiers
- Browser type and version
- Time zone setting and location

**User Generated Content:**
- Voice recordings (if you use voice features)
- Profile customizations
- Team and challenge participation
- Comments and social interactions

**Payment Information:**
- Processed securely through Stripe and Paddle
- We do not store full credit card details
- Billing history and subscription status`
        },
        {
          id: "legal-basis",
          title: "3. Legal Basis for Processing (KVKK/GDPR)",
          content: `We process your personal data based on the following legal grounds:

**Contractual Necessity (KVKK Art. 5/2-c, GDPR Art. 6/1-b):**
- Account creation and management
- Providing core service functionality
- Processing payments and subscriptions

**Legitimate Interests (KVKK Art. 5/2-f, GDPR Art. 6/1-f):**
- Improving and optimizing our services
- Analytics and performance monitoring
- Fraud prevention and security

**Consent (KVKK Art. 5/1, GDPR Art. 6/1-a):**
- Marketing communications
- Optional analytics tracking
- AI coaching features and personalization
- Push notifications

**Legal Obligations (KVKK Art. 5/2-ç, GDPR Art. 6/1-c):**
- Tax and accounting records
- Responding to legal requests

You may withdraw your consent at any time through your account settings or by contacting us at privacy@lilove.org. Withdrawal of consent does not affect the lawfulness of processing based on consent before withdrawal.`
        },
        {
          id: "use",
          title: "4. How We Use Your Information",
          content: `We use the information we collect for the following purposes:

**Service Delivery:**
- Create and manage your account
- Provide core functionality (goals, tasks, habits tracking)
- Enable AI coach features and personalized recommendations
- Process your transactions and manage subscriptions
- Send you important service notifications

**Personalization:**
- Customize your experience based on your preferences
- Provide tailored content and recommendations
- Show relevant challenges and achievements
- Optimize gamification elements for your engagement

**Communication:**
- Send push notifications (with your permission)
- Email you about account activity, updates, and features
- Respond to your support requests and inquiries
- Send marketing communications (you can opt-out anytime)

**Analytics and Improvement:**
- Analyze usage patterns to improve our service
- Monitor and analyze trends
- Debug and fix technical issues
- Develop new features based on user behavior

**Legal and Safety:**
- Comply with legal obligations
- Enforce our Terms of Service
- Protect against fraud and abuse
- Resolve disputes`
        },
        {
          id: "ai-usage",
          title: "5. AI Data Usage Disclosure",
          content: `LiLove uses artificial intelligence to provide personalized coaching and recommendations. Here's how your data is used with AI:

**AI Features:**
- Personalized habit and goal recommendations
- AI-powered coaching conversations
- Progress insights and analytics
- Motivational content generation

**Data Processing by AI:**
- Your goals, tasks, habits, and progress data may be processed by AI systems to provide personalized recommendations
- Conversation history with the AI coach is stored to maintain context and improve responses
- AI analysis is performed to identify patterns and provide insights

**Third-Party AI Services:**
We use OpenAI's API to power our AI coaching features:
- Data sent to OpenAI includes conversation messages and relevant context
- OpenAI does NOT use your data to train their models
- Data is transmitted securely via encrypted connections
- We minimize the personal data sent to AI systems

**Your Control:**
- You can view and delete your AI conversation history
- You can disable AI-powered features in Settings
- You can request complete deletion of all AI-related data

**Important Notes:**
- AI coaching is for motivational purposes only and is NOT a substitute for professional medical, psychological, or therapeutic advice
- We regularly review AI outputs to ensure quality and safety
- AI recommendations are suggestions only and you maintain full control over your decisions`
        },
        {
          id: "storage",
          title: "6. Data Storage and Security",
          content: `**Database Storage:**
- All personal data is stored in encrypted PostgreSQL databases
- Hosted on secure cloud infrastructure (Neon)
- Regular backups are performed
- Passwords are hashed using industry-standard bcrypt

**File Storage:**
- Profile pictures and voice recordings stored securely
- Access-controlled storage systems
- Encryption at rest and in transit

**Third-Party Services:**
We use the following trusted third-party services:
- **PostHog**: Analytics and product insights (anonymized where possible)
- **Stripe & Paddle**: Payment processing (PCI-DSS compliant)
- **OpenAI**: AI-powered coaching features (data is not used for training)
- **Firebase**: Authentication services and real-time features
- **Neon**: Database hosting with enterprise-grade security
- **Replit**: Application hosting infrastructure

**Security Measures:**
- SSL/TLS encryption for all data transmission
- Regular security audits and updates
- Access controls and authentication
- Monitoring for suspicious activity
- Incident response procedures`
        },
        {
          id: "sharing",
          title: "7. Data Sharing and Disclosure",
          content: `**We Do NOT Sell Your Data**
We never sell, rent, or trade your personal information to third parties for marketing purposes.

**Third-Party Service Providers:**
We share data with trusted service providers who help us operate our service:
- Payment processors (Stripe, Paddle)
- Analytics providers (PostHog)
- Cloud hosting providers (Neon, Replit)
- AI service providers (OpenAI)
- Authentication services (Firebase)
- Email service providers

All third-party providers are contractually obligated to protect your data and use it only for specified purposes. We ensure they comply with KVKK and GDPR requirements.

**Legal Requirements:**
We may disclose your information if required by law, such as:
- To comply with legal processes or government requests
- To enforce our Terms of Service
- To protect our rights, privacy, safety, or property
- To prevent fraud or security issues

**Business Transfers:**
If LiLove is acquired or merged with another company, your data may be transferred as part of that transaction. We will notify you before your data is transferred and becomes subject to a different privacy policy.

**With Your Consent:**
We may share your information with your explicit consent for purposes not covered in this policy.`
        },
        {
          id: "rights",
          title: "8. Your Rights (GDPR/KVKK)",
          content: `Under GDPR (European Union) and KVKK (Turkey - Law No. 6698), you have the following rights:

**Right to Access (KVKK Art. 11/1-b, GDPR Art. 15):**
- Request a copy of your personal data
- Available through Settings > Export Data

**Right to Rectification (KVKK Art. 11/1-d, GDPR Art. 16):**
- Update or correct your personal information
- Available through Settings > Profile

**Right to Erasure ("Right to be Forgotten") (KVKK Art. 11/1-e, GDPR Art. 17):**
- Request deletion of your account and all associated data
- Available through Settings > Delete Account
- Data will be permanently deleted within 30 days

**Right to Data Portability (KVKK Art. 11/1-ğ, GDPR Art. 20):**
- Export your data in a machine-readable format (JSON)
- Includes goals, tasks, habits, and progress data

**Right to Restrict Processing (KVKK Art. 11/1-ç, GDPR Art. 18):**
- Request limitation on how we use your data
- Contact privacy@lilove.org

**Right to Object (KVKK Art. 11/1-e, GDPR Art. 21):**
- Object to processing based on legitimate interests
- Opt-out of marketing communications anytime
- Disable analytics tracking in Settings

**Right to Withdraw Consent (KVKK Art. 11/1-a, GDPR Art. 7):**
- Withdraw consent for data processing anytime
- This may limit service functionality

**Right to Lodge a Complaint:**
- File a complaint with your local data protection authority
- EU: Your local supervisory authority
- Turkey: Kişisel Verileri Koruma Kurumu (KVKK) - https://kvkk.gov.tr

**How to Exercise Your Rights:**
To exercise any of these rights, you may:
- Use in-app settings
- Email us at privacy@lilove.org
- Send written request to our address

We will respond to your request within 30 days.`
        },
        {
          id: "cookies",
          title: "9. Cookies and Tracking",
          content: `**Essential Cookies:**
- Session management (required for login)
- Authentication tokens
- Security features

**Analytics Cookies:**
- PostHog analytics (tracks usage patterns)
- Can be disabled in Settings > Privacy

**OAuth Tokens:**
- Google and Apple sign-in tokens
- Stored securely for authentication
- Revocable anytime through your OAuth provider

**Your Cookie Choices:**
- You can disable non-essential cookies in Settings
- Browser settings allow cookie blocking (may affect functionality)
- Clear cookies anytime through your browser

**Do Not Track:**
We respect Do Not Track (DNT) browser signals. When DNT is enabled, we disable non-essential analytics.`
        },
        {
          id: "children",
          title: "10. Children's Privacy",
          content: `LiLove is not intended for children under 13 years of age.

- We do not knowingly collect personal information from children under 13
- Age verification is required during registration
- If we discover data from a child under 13, we will delete it immediately
- Parents who believe we may have information about their child should contact privacy@lilove.org

If you are between 13 and 18, you may only use LiLove with parental or guardian consent.`
        },
        {
          id: "transfers",
          title: "11. International Data Transfers",
          content: `LiLove operates globally, and your data may be transferred to and processed in countries other than your own.

**Data Transfer Mechanisms:**
- EU-US Data Privacy Framework compliance
- Standard Contractual Clauses (SCCs) for EU data
- Adequate safeguards for all international transfers

**Data Locations:**
- Primary servers: United States (Neon, Replit infrastructure)
- CDN and edge locations: Global
- All locations maintain equivalent security standards

We ensure that all international transfers comply with applicable data protection laws, including GDPR and KVKK. Where required, we use appropriate transfer mechanisms such as Standard Contractual Clauses approved by the European Commission.`
        },
        {
          id: "retention",
          title: "12. Data Retention",
          content: `We retain your personal data only as long as necessary for the purposes outlined in this policy:

**Active Accounts:**
- Data retained while your account is active
- Regular cleanup of old analytics data (90 days)

**Deleted Accounts:**
- Data permanently deleted within 30 days of deletion request
- Some data may be retained longer if required by law
- Backup systems purged within 90 days

**Legal Requirements:**
- Financial records retained for 10 years (Turkish Commercial Code)
- Tax-related data retained for 5 years (Turkish Tax Law)
- Security logs retained for 1 year
- Anonymized analytics may be retained indefinitely`
        },
        {
          id: "changes",
          title: "13. Changes to Privacy Policy",
          content: `We may update this privacy policy from time to time to reflect changes in our practices or legal requirements.

**Notification:**
- Email notification for significant changes
- In-app notification upon next login
- "Last Updated" date at the top of this policy

**Your Continued Use:**
- Continued use after changes constitutes acceptance
- If you disagree, please stop using the service and delete your account

We encourage you to review this policy periodically.`
        },
        {
          id: "contact",
          title: "14. Contact Information",
          content: `If you have questions, concerns, or requests regarding this privacy policy or our data practices:

**Data Controller:**
LiLove Teknoloji A.Ş.
Levent Mahallesi, Büyükdere Caddesi No: 201
Şişli, İstanbul, Türkiye

**Email:** privacy@lilove.org
**Phone:** +90 212 999 00 00
**Website:** https://lilove.org

**Data Protection Officer:**
Available at privacy@lilove.org

**Response Time:**
We aim to respond to all privacy requests within 30 days.

**Supervisory Authorities:**
- For GDPR requests (EU residents): Your local supervisory authority
- For KVKK requests (Turkey residents): Kişisel Verileri Koruma Kurumu (KVKK)
  Address: Nasuh Akar Mah. Ziyabey Cad. 1407. Sok. No:4, 06520 Balgat-Çankaya/Ankara
  Website: https://kvkk.gov.tr`
        }
      ]
    },
    terms: {
      title: "Terms of Service",
      lastUpdated: "January 6, 2026",
      sections: [
        {
          id: "intro",
          title: "Introduction",
          content: `Welcome to LiLove. These Terms of Service ("Terms") govern your access to and use of the LiLove website, mobile application, and related services (collectively, the "Service") provided by LiLove Teknoloji A.Ş. ("LiLove", "we", "us", or "our"). By accessing or using our Service, you agree to be bound by these Terms.

**Company Information:**
LiLove Teknoloji A.Ş.
Levent Mahallesi, Büyükdere Caddesi No: 201
Şişli, İstanbul, Türkiye`
        },
        {
          id: "acceptance",
          title: "1. Acceptance of Terms",
          content: `By creating an account or using LiLove, you agree to:
- These Terms of Service
- Our Privacy Policy
- All applicable laws and regulations

If you do not agree to these Terms, you must not use the Service.

**Binding Agreement:**
These Terms constitute a legally binding agreement between you and LiLove Teknoloji A.Ş. Your continued use of the Service constitutes ongoing acceptance of these Terms, including any modifications.`
        },
        {
          id: "service",
          title: "2. Service Description",
          content: `LiLove is a personal development platform that provides:

**Core Features:**
- Goal setting and tracking
- Habit formation and monitoring
- Task management
- Progress analytics and insights
- Gamification elements (achievements, challenges, leagues)

**AI-Powered Features:**
- AI coaching and personalized recommendations
- Motivational content and insights
- Behavioral pattern analysis

**Social Features:**
- Team challenges
- Leaderboards
- Community engagement

**Important Disclaimer:**
LiLove is designed for personal productivity and motivation enhancement. It is NOT:
- A medical device or healthcare service
- A substitute for professional mental health treatment
- A replacement for therapy or counseling

If you are experiencing mental health issues, please seek help from qualified professionals.`
        },
        {
          id: "accounts",
          title: "3. User Accounts",
          content: `**Age Requirement:**
- You must be at least 13 years old to use LiLove
- Users between 13-18 must have parental/guardian consent
- We reserve the right to request age verification

**Account Creation:**
- Provide accurate and complete information
- Maintain the security of your password
- Accept responsibility for all account activity
- Do not share your account credentials

**Account Security:**
- You are responsible for maintaining account confidentiality
- Notify us immediately of unauthorized access at support@lilove.org
- We are not liable for losses from unauthorized use

**Account Termination:**
We reserve the right to suspend or terminate your account if:
- You violate these Terms
- You engage in fraudulent or illegal activity
- Your account is inactive for 2+ years
- We discontinue the Service

**User Termination:**
- You may delete your account anytime through Settings
- Account deletion is permanent and cannot be undone
- Some data may be retained as required by law`
        },
        {
          id: "subscriptions",
          title: "4. Subscriptions and Payments",
          content: `**Subscription Plans:**
- Free Plan: Basic features with limitations
- Premium Plans: Enhanced features, pricing varies by region
- Current pricing available at lilove.org/pricing

**Billing:**
- Subscriptions billed monthly or annually
- Charged in advance on a recurring basis
- Prices subject to change with 30 days notice
- Processed securely through Stripe or Paddle

**Auto-Renewal:**
- Subscriptions automatically renew unless cancelled
- You can cancel anytime through Settings
- Cancellation takes effect at end of current billing period
- No refunds for partial periods

**Refund Policy:**
- 30-day money-back guarantee for first-time subscribers
- Request refunds within 30 days of initial purchase
- Contact support@lilove.org for refund requests
- Refunds processed within 14 business days

**Payment Methods:**
- Credit/debit cards via Stripe
- Alternative payment methods via Paddle
- All transactions are secure and encrypted

**Failed Payments:**
- Service may be suspended if payment fails
- You'll receive email notification before suspension
- Reactivate by updating payment information

**Taxes:**
- Prices may not include applicable taxes
- You are responsible for any sales, use, or VAT taxes
- Turkish users: KDV (VAT) may apply`
        },
        {
          id: "content",
          title: "5. User Content",
          content: `**Content Ownership:**
- You retain ownership of all content you create (goals, tasks, notes, etc.)
- You are responsible for your content and its legality

**License Grant:**
By posting content on LiLove, you grant us:
- Non-exclusive, worldwide, royalty-free license
- Right to use, store, display, and process your content
- Only for providing and improving the Service
- License terminates when you delete content or your account

**Prohibited Content:**
You may not post content that:
- Is illegal, harmful, or fraudulent
- Infringes intellectual property rights
- Contains malware or viruses
- Harasses, threatens, or abuses others
- Is sexually explicit or offensive
- Promotes violence or discrimination
- Violates any law or regulation

**Content Moderation:**
- We reserve the right to remove prohibited content
- We may suspend accounts that violate content policies
- We are not obligated to monitor all content`
        },
        {
          id: "ip",
          title: "6. Intellectual Property",
          content: `**LiLove Ownership:**
All rights, title, and interest in the Service, including:
- LiLove name, logo, and trademarks
- Software, code, and algorithms
- Design, layout, and user interface
- Documentation and content
- AI models and systems

**Limited License:**
We grant you a limited, non-exclusive, non-transferable license to:
- Access and use the Service for personal use
- Subject to these Terms and our policies

**Restrictions:**
You may not:
- Copy, modify, or create derivative works
- Reverse engineer or decompile the software
- Remove proprietary notices or labels
- Use LiLove trademarks without permission
- Frame or mirror any Service content

**Copyright:**
© 2026 LiLove Teknoloji A.Ş. All rights reserved.

**DMCA/Copyright Claims:**
If you believe content infringes your copyright, contact legal@lilove.org with:
- Description of copyrighted work
- Location of infringing material
- Your contact information
- Statement of good faith belief
- Statement under penalty of perjury`
        },
        {
          id: "prohibited",
          title: "7. Prohibited Uses",
          content: `You agree not to:

**Illegal Activities:**
- Violate any laws or regulations
- Engage in fraudulent activities
- Facilitate illegal transactions

**Service Abuse:**
- Attempt to gain unauthorized access
- Interfere with service functionality
- Transmit viruses or malicious code
- Overload or disrupt servers
- Bypass security measures

**Scraping and Automation:**
- Scrape or harvest user data
- Use bots or automated tools (except approved APIs)
- Create fake accounts
- Spam or send unsolicited messages

**Impersonation:**
- Impersonate others
- Misrepresent affiliation with LiLove
- Create misleading accounts

**Commercial Misuse:**
- Resell or redistribute the Service
- Use for competitive purposes
- Sublicense your access

Violations may result in immediate account termination and legal action.`
        },
        {
          id: "disclaimers",
          title: "8. Disclaimers",
          content: `**"AS IS" Service:**
The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to:
- Merchantability
- Fitness for a particular purpose
- Non-infringement
- Accuracy or completeness
- Uninterrupted or error-free operation

**No Medical Advice:**
- LiLove is NOT a medical device or healthcare provider
- AI coaching is for motivational purposes only
- Do not rely on LiLove for medical, mental health, or professional advice
- Consult qualified professionals for health concerns
- We are not responsible for health outcomes

**No Guarantee of Results:**
- We do not guarantee specific outcomes or achievements
- Results depend on individual effort and circumstances
- Past performance does not predict future results

**Third-Party Content:**
- We are not responsible for third-party websites or services
- Links to external sites are for convenience only
- Third-party terms and privacy policies apply

**Availability:**
- We do not guarantee continuous availability
- Service may be interrupted for maintenance
- Features may be added, modified, or removed`
        },
        {
          id: "liability",
          title: "9. Limitation of Liability",
          content: `To the maximum extent permitted by law:

**No Liability:**
LiLove Teknoloji A.Ş. and its officers, directors, employees, and agents shall not be liable for:
- Indirect, incidental, or consequential damages
- Loss of profits, revenue, or data
- Loss of business opportunity
- Personal injury or property damage
- Any damages arising from use or inability to use the Service

**Maximum Liability:**
Our total liability shall not exceed the greater of:
- Amount you paid to LiLove in the past 12 months
- 100 USD (or equivalent in local currency)

**Exceptions:**
This limitation does not apply to:
- Damages caused by gross negligence or willful misconduct
- Liability that cannot be excluded by Turkish law
- Personal injury caused by our negligence

**Jurisdictional Variations:**
Some jurisdictions do not allow limitation of certain damages. In such cases, our liability is limited to the fullest extent permitted by law.`
        },
        {
          id: "indemnification",
          title: "10. Indemnification",
          content: `You agree to indemnify, defend, and hold harmless LiLove Teknoloji A.Ş. and its officers, directors, employees, agents, and affiliates from any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from:

- Your use or misuse of the Service
- Your violation of these Terms
- Your violation of any law or regulation
- Your violation of third-party rights
- Content you submit or transmit
- Your negligence or willful misconduct

We reserve the right to assume exclusive defense and control of any matter subject to indemnification, and you agree to cooperate with our defense of such claims.`
        },
        {
          id: "governing",
          title: "11. Governing Law and Jurisdiction",
          content: `**Governing Law:**
These Terms are governed by and construed in accordance with:
- Laws of the Republic of Turkey
- Without regard to conflict of law principles

**Jurisdiction:**
Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts in Istanbul, Turkey.

**For EU Users:**
Nothing in these Terms affects your statutory rights under EU consumer protection laws. You may also bring proceedings in the courts of your country of residence.

**For Turkey Users:**
These Terms comply with Turkish law, including but not limited to:
- Turkish Code of Obligations (No. 6098)
- Consumer Protection Law (No. 6502)
- Personal Data Protection Law (KVKK - No. 6698)
- Electronic Commerce Law (No. 6563)`
        },
        {
          id: "disputes",
          title: "12. Dispute Resolution",
          content: `**Informal Resolution:**
Before filing a claim, please contact support@lilove.org to attempt informal resolution. We'll work in good faith to resolve disputes within 30 days.

**Mediation (Turkey):**
If informal resolution fails, disputes may be submitted to:
- Istanbul Consumer Arbitration Committee (for consumer disputes under legal threshold)
- Istanbul Commercial Courts of First Instance

**Arbitration (International):**
For international disputes, arbitration may be conducted:
- Under Istanbul Chamber of Commerce Arbitration Rules
- Location: Istanbul, Turkey
- Language: English or Turkish
- One arbitrator selected mutually

**Class Action Waiver:**
To the extent permitted by law, you agree to resolve disputes individually, not as part of any class or representative action.

**Exceptions:**
Either party may seek injunctive relief in court to protect intellectual property rights.

**EU and Turkey Consumer Rights:**
Mandatory consumer protection laws of your jurisdiction may provide additional rights that cannot be waived.`
        },
        {
          id: "termination",
          title: "13. Termination",
          content: `**Termination by You:**
- You may terminate your account at any time through Settings
- Upon termination, your right to use the Service ends immediately
- Data deletion follows our Privacy Policy

**Termination by Us:**
We may terminate or suspend your access:
- Immediately, for Terms violations
- With 30 days notice, for any other reason
- Immediately, if required by law

**Effect of Termination:**
Upon termination:
- Your license to use the Service ends
- You remain liable for prior breaches
- Provisions that should survive termination will survive
- We may delete your data after the retention period

**Refunds Upon Termination:**
- No refunds for termination due to Terms violations
- Pro-rata refund may be available if we terminate without cause`
        },
        {
          id: "general",
          title: "14. General Provisions",
          content: `**Entire Agreement:**
These Terms, together with our Privacy Policy, constitute the entire agreement between you and LiLove Teknoloji A.Ş.

**Severability:**
If any provision is found invalid or unenforceable, the remaining provisions remain in full effect.

**Waiver:**
Failure to enforce any right or provision does not constitute a waiver of that right or provision.

**Assignment:**
You may not assign or transfer these Terms. We may assign our rights and obligations without restriction.

**Force Majeure:**
We are not liable for delays or failures due to causes beyond our reasonable control, including natural disasters, war, terrorism, strikes, or government actions.

**Survival:**
Provisions that by their nature should survive termination shall survive, including ownership, disclaimers, indemnification, and liability limitations.

**Language:**
These Terms are provided in English and Turkish. In case of conflict, the Turkish version prevails for users in Turkey.`
        },
        {
          id: "changes",
          title: "15. Changes to Terms",
          content: `We may modify these Terms at any time:

**Notification:**
- Email notification for material changes
- In-app notification upon next login
- "Last Updated" date at the top of this document

**Acceptance:**
- Continued use after changes constitutes acceptance
- If you disagree, you must stop using the Service

**Review:**
We encourage you to review these Terms periodically.`
        },
        {
          id: "contact",
          title: "16. Contact Information",
          content: `For questions about these Terms:

**LiLove Teknoloji A.Ş.**
Levent Mahallesi, Büyükdere Caddesi No: 201
Şişli, İstanbul, Türkiye

**Email:** legal@lilove.org
**Support:** support@lilove.org
**Phone:** +90 212 999 00 00

**Business Hours:**
Monday - Friday, 9 AM - 6 PM (GMT+3 Turkey Time)

We aim to respond to all inquiries within 3-5 business days.`
        }
      ]
    }
  },
  tr: {
    privacy: {
      title: "Gizlilik Politikası",
      lastUpdated: "6 Ocak 2026",
      sections: [
        {
          id: "intro",
          title: "Giriş",
          content: `LiLove'a hoş geldiniz. LiLove Teknoloji A.Ş. ("LiLove", "biz" veya "bizim") gizliliğinize saygı duyuyor ve kişisel verilerinizi koruma konusunda kararlıdır. Bu gizlilik politikası, web sitemizi ziyaret ettiğinizde veya mobil uygulamamızı kullandığınızda kişisel verilerinizi nasıl işlediğimizi ve gizlilik haklarınız ile kanunun sizi nasıl koruduğunu açıklamaktadır.

Bu politika, Türkiye'deki kullanıcılarımız için 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Avrupa Birliği'ndeki kullanıcılarımız için Genel Veri Koruma Tüzüğü (GDPR) ile uyumludur.`
        },
        {
          id: "controller",
          title: "1. Veri Sorumlusu",
          content: `LiLove Teknoloji A.Ş. kişisel verilerinizden sorumlu veri sorumlusudur.

**Şirket Bilgileri:**
- Şirket Adı: LiLove Teknoloji A.Ş.
- Adres: Levent Mahallesi, Büyükdere Caddesi No: 201, Şişli, İstanbul, Türkiye
- E-posta: privacy@lilove.org
- Telefon: +90 212 999 00 00
- Web Sitesi: https://lilove.org

**Veri Koruma Görevlisi:**
Kişisel verileriniz veya bu gizlilik politikası hakkındaki sorularınız için privacy@lilove.org adresinden Veri Koruma Görevlimize ulaşabilirsiniz.`
        },
        {
          id: "collect",
          title: "2. Topladığımız Bilgiler",
          content: `Hizmetimizin kullanıcılarından çeşitli türde bilgiler topluyoruz:

**Kişisel Bilgiler:**
- Ad ve görünen ad
- E-posta adresi
- Profil resmi ve avatar özelleştirmeleri
- Kullanıcı adı ve şifre (şifrelenmiş)
- Doğum tarihi (yaş doğrulaması için)
- Konum verisi (isteğe bağlı, kişiselleştirme için)

**OAuth Verileri:**
- Google OAuth: E-posta, ad, profil resmi
- Apple Sign-In: E-posta, ad (isteğe bağlı)

**Kullanım Verileri:**
- Oluşturduğunuz hedefler, görevler ve alışkanlıklar
- İlerleme takibi ve tamamlanma verileri
- AI koç etkileşimleri ve mesajları
- Analitik verileri (PostHog aracılığıyla)
- Performans metrikleri ve uygulama kullanım kalıpları
- Cihaz türü, işletim sistemi, tarayıcı bilgileri

**Cihaz Bilgileri:**
- IP adresi
- Cihaz tanımlayıcıları
- Tarayıcı türü ve sürümü
- Saat dilimi ayarı ve konum

**Kullanıcı Tarafından Oluşturulan İçerik:**
- Ses kayıtları (ses özelliklerini kullanırsanız)
- Profil özelleştirmeleri
- Takım ve meydan okuma katılımı
- Yorumlar ve sosyal etkileşimler

**Ödeme Bilgileri:**
- Stripe ve Paddle aracılığıyla güvenli şekilde işlenir
- Tam kredi kartı detaylarını saklamıyoruz
- Fatura geçmişi ve abonelik durumu`
        },
        {
          id: "legal-basis",
          title: "3. İşlemenin Hukuki Dayanağı (KVKK/GDPR)",
          content: `Kişisel verilerinizi aşağıdaki hukuki dayanaklara göre işliyoruz:

**Sözleşmenin İfası (KVKK m. 5/2-c, GDPR m. 6/1-b):**
- Hesap oluşturma ve yönetme
- Temel hizmet işlevselliği sağlama
- Ödemeleri ve abonelikleri işleme

**Meşru Menfaat (KVKK m. 5/2-f, GDPR m. 6/1-f):**
- Hizmetlerimizi iyileştirme ve optimize etme
- Analitik ve performans izleme
- Dolandırıcılığı önleme ve güvenlik

**Açık Rıza (KVKK m. 5/1, GDPR m. 6/1-a):**
- Pazarlama iletişimleri
- İsteğe bağlı analitik takibi
- AI koçluk özellikleri ve kişiselleştirme
- Push bildirimleri

**Hukuki Yükümlülük (KVKK m. 5/2-ç, GDPR m. 6/1-c):**
- Vergi ve muhasebe kayıtları
- Yasal taleplere yanıt verme

Onayınızı hesap ayarlarınızdan veya privacy@lilove.org adresine başvurarak istediğiniz zaman geri çekebilirsiniz. Onayın geri çekilmesi, geri çekilmeden önce onaya dayalı işlemenin hukuka uygunluğunu etkilemez.`
        },
        {
          id: "use",
          title: "4. Bilgilerinizi Nasıl Kullanıyoruz",
          content: `Topladığımız bilgileri aşağıdaki amaçlar için kullanıyoruz:

**Hizmet Sunumu:**
- Hesabınızı oluşturma ve yönetme
- Temel işlevsellik sağlama (hedefler, görevler, alışkanlık takibi)
- AI koç özellikleri ve kişiselleştirilmiş öneriler sunma
- İşlemlerinizi işleme ve abonelikleri yönetme
- Önemli hizmet bildirimleri gönderme

**Kişiselleştirme:**
- Tercihlerinize göre deneyiminizi özelleştirme
- Özel içerik ve öneriler sunma
- İlgili meydan okumalar ve başarılar gösterme
- Katılımınız için oyunlaştırma öğelerini optimize etme

**İletişim:**
- Push bildirimleri gönderme (izninizle)
- Hesap aktivitesi, güncellemeler ve özellikler hakkında e-posta gönderme
- Destek taleplerinize ve sorularınıza yanıt verme
- Pazarlama iletişimleri gönderme (istediğiniz zaman vazgeçebilirsiniz)

**Analitik ve İyileştirme:**
- Hizmetimizi iyileştirmek için kullanım kalıplarını analiz etme
- Trendleri izleme ve analiz etme
- Teknik sorunları tespit etme ve düzeltme
- Kullanıcı davranışına göre yeni özellikler geliştirme

**Yasal ve Güvenlik:**
- Yasal yükümlülüklere uyma
- Hizmet Şartlarımızı uygulama
- Dolandırıcılık ve kötüye kullanıma karşı koruma
- Anlaşmazlıkları çözme`
        },
        {
          id: "ai-usage",
          title: "5. AI Veri Kullanımı Açıklaması",
          content: `LiLove, kişiselleştirilmiş koçluk ve öneriler sağlamak için yapay zeka kullanmaktadır. Verilerinizin AI ile nasıl kullanıldığı aşağıda açıklanmaktadır:

**AI Özellikleri:**
- Kişiselleştirilmiş alışkanlık ve hedef önerileri
- AI destekli koçluk konuşmaları
- İlerleme içgörüleri ve analizler
- Motivasyonel içerik üretimi

**AI Tarafından Veri İşleme:**
- Hedefleriniz, görevleriniz, alışkanlıklarınız ve ilerleme verileriniz kişiselleştirilmiş öneriler sağlamak için AI sistemleri tarafından işlenebilir
- AI koç ile konuşma geçmişi bağlamı korumak ve yanıtları iyileştirmek için saklanır
- Kalıpları belirlemek ve içgörüler sağlamak için AI analizi yapılır

**Üçüncü Taraf AI Hizmetleri:**
AI koçluk özelliklerimizi güçlendirmek için OpenAI API kullanıyoruz:
- OpenAI'ye gönderilen veriler konuşma mesajlarını ve ilgili bağlamı içerir
- OpenAI verilerinizi modellerini eğitmek için KULLANMAZ
- Veriler şifreli bağlantılar aracılığıyla güvenli şekilde iletilir
- AI sistemlerine gönderilen kişisel verileri en aza indiriyoruz

**Kontrolünüz:**
- AI konuşma geçmişinizi görüntüleyebilir ve silebilirsiniz
- Ayarlar'da AI destekli özellikleri devre dışı bırakabilirsiniz
- Tüm AI ile ilgili verilerin tamamen silinmesini talep edebilirsiniz

**Önemli Notlar:**
- AI koçluk yalnızca motivasyon amaçlıdır ve profesyonel tıbbi, psikolojik veya terapötik tavsiyenin yerini TUTMAZ
- Kalite ve güvenliği sağlamak için AI çıktılarını düzenli olarak gözden geçiriyoruz
- AI önerileri yalnızca tavsiye niteliğindedir ve kararlarınız üzerinde tam kontrole sahipsiniz`
        },
        {
          id: "storage",
          title: "6. Veri Depolama ve Güvenlik",
          content: `**Veritabanı Depolama:**
- Tüm kişisel veriler şifrelenmiş PostgreSQL veritabanlarında saklanır
- Güvenli bulut altyapısında (Neon) barındırılır
- Düzenli yedeklemeler yapılır
- Şifreler endüstri standardı bcrypt ile hash'lenir

**Dosya Depolama:**
- Profil resimleri ve ses kayıtları güvenli şekilde saklanır
- Erişim kontrollü depolama sistemleri
- Dinlenme ve aktarım sırasında şifreleme

**Üçüncü Taraf Hizmetler:**
Aşağıdaki güvenilir üçüncü taraf hizmetleri kullanıyoruz:
- **PostHog**: Analitik ve ürün içgörüleri (mümkün olduğunda anonimleştirilmiş)
- **Stripe & Paddle**: Ödeme işleme (PCI-DSS uyumlu)
- **OpenAI**: AI destekli koçluk özellikleri (veriler eğitim için kullanılmaz)
- **Firebase**: Kimlik doğrulama hizmetleri ve gerçek zamanlı özellikler
- **Neon**: Kurumsal düzeyde güvenlikle veritabanı barındırma
- **Replit**: Uygulama barındırma altyapısı

**Güvenlik Önlemleri:**
- Tüm veri iletimi için SSL/TLS şifrelemesi
- Düzenli güvenlik denetimleri ve güncellemeler
- Erişim kontrolleri ve kimlik doğrulama
- Şüpheli aktivite izleme
- Olay müdahale prosedürleri`
        },
        {
          id: "sharing",
          title: "7. Veri Paylaşımı ve Açıklama",
          content: `**Verilerinizi SATMIYORUZ**
Kişisel bilgilerinizi pazarlama amaçlı olarak asla üçüncü taraflara satmıyor, kiralamıyor veya takas etmiyoruz.

**Üçüncü Taraf Hizmet Sağlayıcılar:**
Hizmetimizi işletmemize yardımcı olan güvenilir hizmet sağlayıcılarla veri paylaşıyoruz:
- Ödeme işlemcileri (Stripe, Paddle)
- Analitik sağlayıcılar (PostHog)
- Bulut barındırma sağlayıcıları (Neon, Replit)
- AI hizmet sağlayıcıları (OpenAI)
- Kimlik doğrulama hizmetleri (Firebase)
- E-posta hizmet sağlayıcıları

Tüm üçüncü taraf sağlayıcılar, verilerinizi korumak ve yalnızca belirtilen amaçlar için kullanmak üzere sözleşmesel olarak yükümlüdür. KVKK ve GDPR gerekliliklerine uymalarını sağlıyoruz.

**Yasal Gereklilikler:**
Kanunun gerektirdiği durumlarda bilgilerinizi açıklayabiliriz, örneğin:
- Yasal süreçlere veya hükümet taleplerine uymak için
- Hizmet Şartlarımızı uygulamak için
- Haklarımızı, gizliliğimizi, güvenliğimizi veya mülkiyetimizi korumak için
- Dolandırıcılığı veya güvenlik sorunlarını önlemek için

**İş Transferleri:**
LiLove başka bir şirket tarafından satın alınır veya birleştirilirse, verileriniz bu işlemin bir parçası olarak aktarılabilir. Verileriniz aktarılmadan ve farklı bir gizlilik politikasına tabi olmadan önce size bildirilecektir.

**İzninizle:**
Bu politikada belirtilmeyen amaçlarla açık izninizle bilgilerinizi paylaşabiliriz.`
        },
        {
          id: "rights",
          title: "8. Haklarınız (GDPR/KVKK)",
          content: `GDPR (Avrupa Birliği) ve KVKK (Türkiye - 6698 sayılı Kanun) kapsamında aşağıdaki haklara sahipsiniz:

**Erişim Hakkı (KVKK m. 11/1-b, GDPR m. 15):**
- Kişisel verilerinizin bir kopyasını talep edin
- Ayarlar > Verileri Dışa Aktar üzerinden kullanılabilir

**Düzeltme Hakkı (KVKK m. 11/1-d, GDPR m. 16):**
- Kişisel bilgilerinizi güncelleyin veya düzeltin
- Ayarlar > Profil üzerinden kullanılabilir

**Silme Hakkı ("Unutulma Hakkı") (KVKK m. 11/1-e, GDPR m. 17):**
- Hesabınızın ve ilişkili tüm verilerin silinmesini talep edin
- Ayarlar > Hesabı Sil üzerinden kullanılabilir
- Veriler 30 gün içinde kalıcı olarak silinecektir

**Veri Taşınabilirliği Hakkı (KVKK m. 11/1-ğ, GDPR m. 20):**
- Verilerinizi makine tarafından okunabilir formatta (JSON) dışa aktarın
- Hedefler, görevler, alışkanlıklar ve ilerleme verilerini içerir

**İşlemeyi Kısıtlama Hakkı (KVKK m. 11/1-ç, GDPR m. 18):**
- Verilerinizi nasıl kullandığımız konusunda sınırlama talep edin
- privacy@lilove.org ile iletişime geçin

**İtiraz Hakkı (KVKK m. 11/1-e, GDPR m. 21):**
- Meşru çıkarlara dayalı işlemeye itiraz edin
- Pazarlama iletişimlerinden istediğiniz zaman vazgeçin
- Ayarlar'da analitik takibini devre dışı bırakın

**Onayı Geri Çekme Hakkı (KVKK m. 11/1-a, GDPR m. 7):**
- Veri işleme onayını istediğiniz zaman geri çekin
- Bu, hizmet işlevselliğini sınırlayabilir

**Şikayet Hakkı:**
- Yerel veri koruma otoritenize şikayette bulunun
- AB: Yerel denetim otoriteniz
- Türkiye: Kişisel Verileri Koruma Kurumu (KVKK) - https://kvkk.gov.tr

**Haklarınızı Nasıl Kullanırsınız:**
Bu haklardan herhangi birini kullanmak için:
- Uygulama içi ayarları kullanın
- privacy@lilove.org adresine e-posta gönderin
- Adresimize yazılı başvuru yapın

Talebinize 30 gün içinde yanıt vereceğiz.`
        },
        {
          id: "cookies",
          title: "9. Çerezler ve Takip",
          content: `**Temel Çerezler:**
- Oturum yönetimi (giriş için gerekli)
- Kimlik doğrulama jetonları
- Güvenlik özellikleri

**Analitik Çerezler:**
- PostHog analitikleri (kullanım kalıplarını takip eder)
- Ayarlar > Gizlilik'te devre dışı bırakılabilir

**OAuth Jetonları:**
- Google ve Apple giriş jetonları
- Kimlik doğrulama için güvenli şekilde saklanır
- OAuth sağlayıcınız aracılığıyla istediğiniz zaman iptal edilebilir

**Çerez Seçenekleriniz:**
- Ayarlar'da temel olmayan çerezleri devre dışı bırakabilirsiniz
- Tarayıcı ayarları çerez engellemeye izin verir (işlevselliği etkileyebilir)
- Tarayıcınız aracılığıyla istediğiniz zaman çerezleri temizleyin

**Takip Etme:**
Do Not Track (DNT) tarayıcı sinyallerine saygı duyuyoruz. DNT etkinleştirildiğinde, temel olmayan analitikleri devre dışı bırakıyoruz.`
        },
        {
          id: "children",
          title: "10. Çocukların Gizliliği",
          content: `LiLove, 13 yaşın altındaki çocuklar için tasarlanmamıştır.

- 13 yaşın altındaki çocuklardan bilerek kişisel bilgi toplamıyoruz
- Kayıt sırasında yaş doğrulaması gereklidir
- 13 yaşın altındaki bir çocuktan veri keşfedersek, derhal sileriz
- Çocuğu hakkında bilgimiz olabileceğine inanan ebeveynler privacy@lilove.org ile iletişime geçmelidir

13-18 yaşları arasındaysanız, LiLove'ı yalnızca ebeveyn veya vasi onayı ile kullanabilirsiniz.`
        },
        {
          id: "transfers",
          title: "11. Uluslararası Veri Transferleri",
          content: `LiLove küresel olarak faaliyet göstermektedir ve verileriniz kendi ülkenizden farklı ülkelere aktarılabilir ve işlenebilir.

**Veri Transfer Mekanizmaları:**
- AB-ABD Veri Gizliliği Çerçevesi uyumluluğu
- AB verileri için Standart Sözleşme Hükümleri (SCC'ler)
- Tüm uluslararası transferler için yeterli güvenceler

**Veri Konumları:**
- Birincil sunucular: Amerika Birleşik Devletleri (Neon, Replit altyapısı)
- CDN ve edge konumları: Küresel
- Tüm konumlar eşdeğer güvenlik standartlarını korur

GDPR ve KVKK dahil olmak üzere, tüm uluslararası transferlerin geçerli veri koruma yasalarına uygun olmasını sağlıyoruz. Gerekli olduğunda, Avrupa Komisyonu tarafından onaylanan Standart Sözleşme Hükümleri gibi uygun transfer mekanizmalarını kullanıyoruz.`
        },
        {
          id: "retention",
          title: "12. Veri Saklama",
          content: `Kişisel verilerinizi yalnızca bu politikada belirtilen amaçlar için gerekli olduğu sürece saklıyoruz:

**Aktif Hesaplar:**
- Hesabınız aktif olduğu sürece veriler saklanır
- Eski analitik verilerin düzenli temizliği (90 gün)

**Silinmiş Hesaplar:**
- Veriler silme talebinden sonra 30 gün içinde kalıcı olarak silinir
- Bazı veriler kanunun gerektirdiği şekilde daha uzun süre saklanabilir
- Yedekleme sistemleri 90 gün içinde temizlenir

**Yasal Gereklilikler:**
- Mali kayıtlar 10 yıl saklanır (Türk Ticaret Kanunu)
- Vergi ile ilgili veriler 5 yıl saklanır (Türk Vergi Kanunu)
- Güvenlik günlükleri 1 yıl saklanır
- Anonimleştirilmiş analitikler süresiz olarak saklanabilir`
        },
        {
          id: "changes",
          title: "13. Gizlilik Politikası Değişiklikleri",
          content: `Uygulamalarımızdaki veya yasal gerekliliklerdeki değişiklikleri yansıtmak için bu gizlilik politikasını zaman zaman güncelleyebiliriz.

**Bildirim:**
- Önemli değişiklikler için e-posta bildirimi
- Bir sonraki girişte uygulama içi bildirim
- Bu politikanın üst kısmında "Son Güncelleme" tarihi

**Devam Eden Kullanımınız:**
- Değişikliklerden sonra devam eden kullanım kabul anlamına gelir
- Katılmıyorsanız, lütfen hizmeti kullanmayı bırakın ve hesabınızı silin

Bu politikayı periyodik olarak gözden geçirmenizi öneririz.`
        },
        {
          id: "contact",
          title: "14. İletişim Bilgileri",
          content: `Bu gizlilik politikası veya veri uygulamalarımız hakkında sorularınız, endişeleriniz veya talepleriniz varsa:

**Veri Sorumlusu:**
LiLove Teknoloji A.Ş.
Levent Mahallesi, Büyükdere Caddesi No: 201
Şişli, İstanbul, Türkiye

**E-posta:** privacy@lilove.org
**Telefon:** +90 212 999 00 00
**Web Sitesi:** https://lilove.org

**Veri Koruma Görevlisi:**
privacy@lilove.org adresinden ulaşılabilir

**Yanıt Süresi:**
Tüm gizlilik taleplerine 30 gün içinde yanıt vermeyi hedefliyoruz.

**Denetim Otoriteleri:**
- GDPR talepleri için (AB sakinleri): Yerel denetim otoriteniz
- KVKK talepleri için (Türkiye sakinleri): Kişisel Verileri Koruma Kurumu (KVKK)
  Adres: Nasuh Akar Mah. Ziyabey Cad. 1407. Sok. No:4, 06520 Balgat-Çankaya/Ankara
  Web Sitesi: https://kvkk.gov.tr`
        }
      ]
    },
    terms: {
      title: "Kullanım Koşulları",
      lastUpdated: "6 Ocak 2026",
      sections: [
        {
          id: "intro",
          title: "Giriş",
          content: `LiLove'a hoş geldiniz. Bu Kullanım Koşulları ("Koşullar"), LiLove Teknoloji A.Ş. ("LiLove", "biz" veya "bizim") tarafından sunulan LiLove web sitesi, mobil uygulama ve ilgili hizmetlere (topluca "Hizmet") erişiminizi ve kullanımınızı düzenler. Hizmetimize erişerek veya kullanarak, bu Koşullara bağlı kalmayı kabul edersiniz.

**Şirket Bilgileri:**
LiLove Teknoloji A.Ş.
Levent Mahallesi, Büyükdere Caddesi No: 201
Şişli, İstanbul, Türkiye`
        },
        {
          id: "acceptance",
          title: "1. Koşulların Kabulü",
          content: `Bir hesap oluşturarak veya LiLove'ı kullanarak, şunları kabul edersiniz:
- Bu Kullanım Koşulları
- Gizlilik Politikamız
- Tüm geçerli yasa ve yönetmelikler

Bu Koşulları kabul etmiyorsanız, Hizmeti kullanmamalısınız.

**Bağlayıcı Sözleşme:**
Bu Koşullar, sizinle LiLove Teknoloji A.Ş. arasında yasal olarak bağlayıcı bir sözleşme oluşturur. Hizmeti sürekli kullanımınız, herhangi bir değişiklik dahil olmak üzere bu Koşulların sürekli kabulünü oluşturur.`
        },
        {
          id: "service",
          title: "2. Hizmet Tanımı",
          content: `LiLove, aşağıdakileri sağlayan bir kişisel gelişim platformudur:

**Temel Özellikler:**
- Hedef belirleme ve takibi
- Alışkanlık oluşturma ve izleme
- Görev yönetimi
- İlerleme analizleri ve içgörüleri
- Oyunlaştırma öğeleri (başarılar, meydan okumalar, ligler)

**AI Destekli Özellikler:**
- AI koçluk ve kişiselleştirilmiş öneriler
- Motivasyonel içerik ve içgörüler
- Davranış kalıpları analizi

**Sosyal Özellikler:**
- Takım meydan okumaları
- Lider tabloları
- Topluluk etkileşimi

**Önemli Uyarı:**
LiLove, kişisel üretkenlik ve motivasyon artırma için tasarlanmıştır. Aşağıdakiler DEĞİLDİR:
- Tıbbi bir cihaz veya sağlık hizmeti
- Profesyonel ruh sağlığı tedavisinin yerine geçecek bir şey
- Terapi veya danışmanlığın yerine geçecek bir şey

Ruh sağlığı sorunları yaşıyorsanız, lütfen nitelikli profesyonellerden yardım alın.`
        },
        {
          id: "accounts",
          title: "3. Kullanıcı Hesapları",
          content: `**Yaş Gereksinimi:**
- LiLove'ı kullanmak için en az 13 yaşında olmalısınız
- 13-18 yaş arası kullanıcılar ebeveyn/vasi onayına sahip olmalıdır
- Yaş doğrulaması talep etme hakkımızı saklı tutarız

**Hesap Oluşturma:**
- Doğru ve eksiksiz bilgi sağlayın
- Şifrenizin güvenliğini koruyun
- Tüm hesap aktivitesinden sorumluluğu kabul edin
- Hesap kimlik bilgilerinizi paylaşmayın

**Hesap Güvenliği:**
- Hesap gizliliğini korumaktan siz sorumlusunuz
- Yetkisiz erişim durumunda support@lilove.org adresine derhal bildirim yapın
- Yetkisiz kullanımdan kaynaklanan kayıplardan sorumlu değiliz

**Hesap Sonlandırma:**
Aşağıdaki durumlarda hesabınızı askıya alma veya sonlandırma hakkımızı saklı tutarız:
- Bu Koşulları ihlal ederseniz
- Dolandırıcılık veya yasa dışı faaliyetlerde bulunursanız
- Hesabınız 2+ yıl boyunca aktif değilse
- Hizmeti sonlandırırsak

**Kullanıcı Tarafından Sonlandırma:**
- Hesabınızı istediğiniz zaman Ayarlar aracılığıyla silebilirsiniz
- Hesap silme kalıcıdır ve geri alınamaz
- Bazı veriler kanunun gerektirdiği şekilde saklanabilir`
        },
        {
          id: "subscriptions",
          title: "4. Abonelikler ve Ödemeler",
          content: `**Abonelik Planları:**
- Ücretsiz Plan: Sınırlamalarla temel özellikler
- Premium Planlar: Gelişmiş özellikler, fiyatlandırma bölgeye göre değişir
- Güncel fiyatlandırma lilove.org/pricing adresinde mevcuttur

**Faturalandırma:**
- Abonelikler aylık veya yıllık faturalandırılır
- Tekrarlayan esasla peşin ücretlendirilir
- Fiyatlar 30 gün önceden haber verilerek değiştirilebilir
- Stripe veya Paddle aracılığıyla güvenli şekilde işlenir

**Otomatik Yenileme:**
- Abonelikler iptal edilmedikçe otomatik olarak yenilenir
- İstediğiniz zaman Ayarlar aracılığıyla iptal edebilirsiniz
- İptal, mevcut faturalama döneminin sonunda geçerli olur
- Kısmi dönemler için iade yoktur

**İade Politikası:**
- İlk kez abone olanlar için 30 günlük para iade garantisi
- İlk satın alma tarihinden itibaren 30 gün içinde iade talep edin
- İade talepleri için support@lilove.org ile iletişime geçin
- İadeler 14 iş günü içinde işlenir

**Ödeme Yöntemleri:**
- Stripe aracılığıyla kredi/banka kartları
- Paddle aracılığıyla alternatif ödeme yöntemleri
- Tüm işlemler güvenli ve şifrelenmiştir

**Başarısız Ödemeler:**
- Ödeme başarısız olursa hizmet askıya alınabilir
- Askıya almadan önce e-posta bildirimi alacaksınız
- Ödeme bilgilerini güncelleyerek yeniden etkinleştirin

**Vergiler:**
- Fiyatlar geçerli vergileri içermeyebilir
- Satış, kullanım veya KDV vergilerinden siz sorumlusunuz
- Türkiye kullanıcıları: KDV uygulanabilir`
        },
        {
          id: "content",
          title: "5. Kullanıcı İçeriği",
          content: `**İçerik Sahipliği:**
- Oluşturduğunuz tüm içeriğin (hedefler, görevler, notlar vb.) sahipliğini siz korursunuz
- İçeriğinizden ve yasallığından siz sorumlusunuz

**Lisans Verme:**
LiLove'da içerik yayınlayarak, bize şunları verirsiniz:
- Münhasır olmayan, dünya çapında, telif ücreti olmayan lisans
- İçeriğinizi kullanma, saklama, görüntüleme ve işleme hakkı
- Yalnızca Hizmeti sağlamak ve iyileştirmek için
- Lisans, içeriği veya hesabınızı sildiğinizde sona erer

**Yasak İçerik:**
Aşağıdaki içerikleri yayınlayamazsınız:
- Yasa dışı, zararlı veya dolandırıcılık içerikli
- Fikri mülkiyet haklarını ihlal eden
- Kötü amaçlı yazılım veya virüs içeren
- Başkalarını taciz eden, tehdit eden veya kötüye kullanan
- Cinsel açıdan müstehcen veya saldırgan
- Şiddeti veya ayrımcılığı teşvik eden
- Herhangi bir yasa veya yönetmeliği ihlal eden

**İçerik Moderasyonu:**
- Yasak içeriği kaldırma hakkımızı saklı tutarız
- İçerik politikalarını ihlal eden hesapları askıya alabiliriz
- Tüm içeriği izleme yükümlülüğümüz yoktur`
        },
        {
          id: "ip",
          title: "6. Fikri Mülkiyet",
          content: `**LiLove Sahipliği:**
Hizmetteki tüm haklar, unvan ve menfaat, şunları içerir:
- LiLove adı, logosu ve ticari markaları
- Yazılım, kod ve algoritmalar
- Tasarım, düzen ve kullanıcı arayüzü
- Dokümantasyon ve içerik
- AI modelleri ve sistemleri

**Sınırlı Lisans:**
Size sınırlı, münhasır olmayan, devredilemez bir lisans veriyoruz:
- Kişisel kullanım için Hizmete erişim ve kullanım
- Bu Koşullara ve politikalarımıza tabi

**Kısıtlamalar:**
Şunları yapamazsınız:
- Kopyalama, değiştirme veya türev eserler oluşturma
- Yazılımı tersine mühendislik veya kaynak kodunu çıkarma
- Mülkiyet bildirimlerini veya etiketleri kaldırma
- İzin olmadan LiLove ticari markalarını kullanma
- Herhangi bir Hizmet içeriğini çerçeveleme veya yansıtma

**Telif Hakkı:**
© 2026 LiLove Teknoloji A.Ş. Tüm hakları saklıdır.

**DMCA/Telif Hakkı İddiaları:**
İçeriğin telif hakkınızı ihlal ettiğine inanıyorsanız, legal@lilove.org adresine şunlarla başvurun:
- Telif haklı eserin açıklaması
- İhlal eden materyalin konumu
- İletişim bilgileriniz
- İyi niyet inancı beyanı
- Yalan yere yemin cezası altında beyan`
        },
        {
          id: "prohibited",
          title: "7. Yasak Kullanımlar",
          content: `Şunları yapmamayı kabul edersiniz:

**Yasa Dışı Faaliyetler:**
- Herhangi bir yasa veya yönetmeliği ihlal etmek
- Dolandırıcılık faaliyetlerinde bulunmak
- Yasa dışı işlemleri kolaylaştırmak

**Hizmet Kötüye Kullanımı:**
- Yetkisiz erişim elde etmeye çalışmak
- Hizmet işlevselliğine müdahale etmek
- Virüs veya kötü amaçlı kod iletmek
- Sunucuları aşırı yüklemek veya bozmak
- Güvenlik önlemlerini atlamak

**Kazıma ve Otomasyon:**
- Kullanıcı verilerini kazımak veya toplamak
- Botlar veya otomatik araçlar kullanmak (onaylanmış API'ler hariç)
- Sahte hesaplar oluşturmak
- Spam göndermek veya istenmeyen mesajlar göndermek

**Kimliğe Bürünme:**
- Başkalarının kimliğine bürünmek
- LiLove ile bağlantıyı yanlış temsil etmek
- Yanıltıcı hesaplar oluşturmak

**Ticari Kötüye Kullanım:**
- Hizmeti yeniden satmak veya yeniden dağıtmak
- Rekabet amaçlı kullanmak
- Erişiminizi alt lisanslamak

İhlaller, derhal hesap sonlandırma ve yasal işlemle sonuçlanabilir.`
        },
        {
          id: "disclaimers",
          title: "8. Feragatnameler",
          content: `**"OLDUĞU GİBİ" Hizmet:**
Hizmet, açık veya zımni herhangi bir garanti olmaksızın "olduğu gibi" ve "mevcut olduğu şekilde" sağlanır, bunlar dahil ancak bunlarla sınırlı olmamak üzere:
- Ticarete elverişlilik
- Belirli bir amaca uygunluk
- İhlal etmeme
- Doğruluk veya tamlık
- Kesintisiz veya hatasız çalışma

**Tıbbi Tavsiye Değildir:**
- LiLove bir tıbbi cihaz veya sağlık hizmeti sağlayıcısı DEĞİLDİR
- AI koçluk yalnızca motivasyon amaçlıdır
- Tıbbi, ruh sağlığı veya profesyonel tavsiye için LiLove'a güvenmeyin
- Sağlık endişeleri için nitelikli profesyonellere danışın
- Sağlık sonuçlarından sorumlu değiliz

**Sonuç Garantisi Yok:**
- Belirli sonuçlar veya başarılar garanti etmiyoruz
- Sonuçlar bireysel çaba ve koşullara bağlıdır
- Geçmiş performans gelecekteki sonuçları tahmin etmez

**Üçüncü Taraf İçeriği:**
- Üçüncü taraf web siteleri veya hizmetlerinden sorumlu değiliz
- Harici sitelere bağlantılar yalnızca kolaylık içindir
- Üçüncü taraf koşulları ve gizlilik politikaları geçerlidir

**Kullanılabilirlik:**
- Sürekli kullanılabilirliği garanti etmiyoruz
- Hizmet bakım için kesintiye uğrayabilir
- Özellikler eklenebilir, değiştirilebilir veya kaldırılabilir`
        },
        {
          id: "liability",
          title: "9. Sorumluluk Sınırlaması",
          content: `Yasaların izin verdiği azami ölçüde:

**Sorumluluk Yok:**
LiLove Teknoloji A.Ş. ve yöneticileri, müdürleri, çalışanları ve temsilcileri aşağıdakilerden sorumlu olmayacaktır:
- Dolaylı, arızi veya sonuç olarak ortaya çıkan zararlar
- Kar, gelir veya veri kaybı
- İş fırsatı kaybı
- Kişisel yaralanma veya mülk hasarı
- Hizmetin kullanımından veya kullanılamamasından kaynaklanan herhangi bir zarar

**Azami Sorumluluk:**
Toplam sorumluluğumuz aşağıdakilerden daha büyük olanı aşmayacaktır:
- Son 12 ayda LiLove'a ödediğiniz tutar
- 100 USD (veya yerel para birimi cinsinden eşdeğeri)

**İstisnalar:**
Bu sınırlama aşağıdakiler için geçerli değildir:
- Ağır ihmal veya kasıtlı kötü niyetten kaynaklanan zararlar
- Türk hukuku tarafından hariç tutulamayan sorumluluk
- İhmalimizden kaynaklanan kişisel yaralanma

**Yetki Alanı Farklılıkları:**
Bazı yetki alanları belirli zararların sınırlandırılmasına izin vermez. Bu gibi durumlarda, sorumluluğumuz yasaların izin verdiği en geniş ölçüde sınırlıdır.`
        },
        {
          id: "indemnification",
          title: "10. Tazminat",
          content: `LiLove Teknoloji A.Ş.'yi ve yöneticilerini, müdürlerini, çalışanlarını, temsilcilerini ve bağlı kuruluşlarını aşağıdakilerden kaynaklanan her türlü talep, sorumluluk, zarar, kayıp ve masraftan (makul yasal ücretler dahil) tazmin etmeyi, savunmayı ve zarar görmemesini sağlamayı kabul edersiniz:

- Hizmeti kullanımınız veya kötüye kullanımınız
- Bu Koşulları ihlal etmeniz
- Herhangi bir yasa veya yönetmeliği ihlal etmeniz
- Üçüncü taraf haklarını ihlal etmeniz
- Gönderdiğiniz veya ilettiğiniz içerik
- İhmaliniz veya kasıtlı kötü niyetiniz

Tazminata tabi herhangi bir konunun münhasır savunmasını ve kontrolünü üstlenme hakkımızı saklı tutarız ve bu tür taleplerin savunmasında bizimle işbirliği yapmayı kabul edersiniz.`
        },
        {
          id: "governing",
          title: "11. Uygulanacak Hukuk ve Yetki",
          content: `**Uygulanacak Hukuk:**
Bu Koşullar aşağıdakilere göre yönetilir ve yorumlanır:
- Türkiye Cumhuriyeti kanunları
- Kanun çatışması ilkeleri dikkate alınmaksızın

**Yetki:**
Bu Koşullardan veya Hizmetten kaynaklanan her türlü uyuşmazlık, İstanbul, Türkiye mahkemelerinin münhasır yetkisine tabi olacaktır.

**AB Kullanıcıları İçin:**
Bu Koşullar'daki hiçbir şey, AB tüketici koruma yasaları kapsamındaki yasal haklarınızı etkilemez. İkamet ettiğiniz ülkenin mahkemelerinde de dava açabilirsiniz.

**Türkiye Kullanıcıları İçin:**
Bu Koşullar, aşağıdakiler dahil ancak bunlarla sınırlı olmamak üzere Türk hukukuna uygundur:
- Türk Borçlar Kanunu (6098 sayılı)
- Tüketicinin Korunması Hakkında Kanun (6502 sayılı)
- Kişisel Verilerin Korunması Kanunu (KVKK - 6698 sayılı)
- Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (6563 sayılı)`
        },
        {
          id: "disputes",
          title: "12. Uyuşmazlık Çözümü",
          content: `**Gayri Resmi Çözüm:**
Bir talep açmadan önce, lütfen gayri resmi çözüm denemek için support@lilove.org ile iletişime geçin. 30 gün içinde uyuşmazlıkları iyi niyetle çözmeye çalışacağız.

**Arabuluculuk (Türkiye):**
Gayri resmi çözüm başarısız olursa, uyuşmazlıklar şunlara sunulabilir:
- İstanbul Tüketici Hakem Heyeti (yasal eşiğin altındaki tüketici uyuşmazlıkları için)
- İstanbul Asliye Ticaret Mahkemeleri

**Tahkim (Uluslararası):**
Uluslararası uyuşmazlıklar için tahkim şu şekilde yürütülebilir:
- İstanbul Ticaret Odası Tahkim Kuralları kapsamında
- Konum: İstanbul, Türkiye
- Dil: İngilizce veya Türkçe
- Karşılıklı olarak seçilen bir hakem

**Toplu Dava Feragati:**
Yasaların izin verdiği ölçüde, uyuşmazlıkları bireysel olarak çözmeyi, herhangi bir toplu veya temsili davanın parçası olarak çözmeyi kabul edersiniz.

**İstisnalar:**
Her iki taraf da fikri mülkiyet haklarını korumak için mahkemede ihtiyati tedbir talep edebilir.

**AB ve Türkiye Tüketici Hakları:**
Yetki alanınızın zorunlu tüketici koruma yasaları, feragat edilemeyen ek haklar sağlayabilir.`
        },
        {
          id: "termination",
          title: "13. Fesih",
          content: `**Sizin Tarafınızdan Fesih:**
- Hesabınızı istediğiniz zaman Ayarlar aracılığıyla feshedebilirsiniz
- Fesih üzerine, Hizmeti kullanma hakkınız derhal sona erer
- Veri silme, Gizlilik Politikamıza uygun olarak gerçekleşir

**Bizim Tarafımızdan Fesih:**
Erişiminizi feshedebilir veya askıya alabiliriz:
- Koşul ihlalleri için derhal
- Diğer herhangi bir nedenle 30 gün önceden haber vererek
- Kanun gerektiriyorsa derhal

**Feshin Etkisi:**
Fesih üzerine:
- Hizmeti kullanma lisansınız sona erer
- Önceki ihlallerden sorumlu kalırsınız
- Fesihten sonra da geçerli olması gereken hükümler geçerli kalır
- Saklama süresinden sonra verilerinizi silebiliriz

**Fesih Üzerine İadeler:**
- Koşul ihlalleri nedeniyle fesih için iade yoktur
- Sebepsiz fesih durumunda orantılı iade mümkün olabilir`
        },
        {
          id: "general",
          title: "14. Genel Hükümler",
          content: `**Tam Sözleşme:**
Bu Koşullar, Gizlilik Politikamızla birlikte, sizinle LiLove Teknoloji A.Ş. arasındaki tam sözleşmeyi oluşturur.

**Bölünebilirlik:**
Herhangi bir hüküm geçersiz veya uygulanamaz bulunursa, kalan hükümler tam olarak yürürlükte kalır.

**Feragat:**
Herhangi bir hak veya hükmü uygulamama, o hak veya hükümden feragat oluşturmaz.

**Devir:**
Bu Koşulları devredemez veya aktaramazsınız. Haklarımızı ve yükümlülüklerimizi kısıtlama olmaksızın devredebiliriz.

**Mücbir Sebep:**
Doğal afetler, savaş, terörizm, grevler veya hükümet eylemleri dahil olmak üzere makul kontrolümüz dışındaki nedenlerden kaynaklanan gecikmeler veya başarısızlıklardan sorumlu değiliz.

**Geçerlilik:**
Doğası gereği fesihten sonra da geçerli olması gereken hükümler, mülkiyet, feragatnameler, tazminat ve sorumluluk sınırlamaları dahil olmak üzere geçerli kalır.

**Dil:**
Bu Koşullar İngilizce ve Türkçe olarak sunulmaktadır. Çelişki durumunda, Türkiye'deki kullanıcılar için Türkçe versiyon geçerlidir.`
        },
        {
          id: "changes",
          title: "15. Koşullardaki Değişiklikler",
          content: `Bu Koşulları istediğimiz zaman değiştirebiliriz:

**Bildirim:**
- Önemli değişiklikler için e-posta bildirimi
- Bir sonraki girişte uygulama içi bildirim
- Bu belgenin üst kısmında "Son Güncelleme" tarihi

**Kabul:**
- Değişikliklerden sonra devam eden kullanım kabul anlamına gelir
- Katılmıyorsanız, Hizmeti kullanmayı bırakmalısınız

**İnceleme:**
Bu Koşulları periyodik olarak gözden geçirmenizi öneririz.`
        },
        {
          id: "contact",
          title: "16. İletişim Bilgileri",
          content: `Bu Koşullar hakkında sorularınız için:

**LiLove Teknoloji A.Ş.**
Levent Mahallesi, Büyükdere Caddesi No: 201
Şişli, İstanbul, Türkiye

**E-posta:** legal@lilove.org
**Destek:** support@lilove.org
**Telefon:** +90 212 999 00 00

**Çalışma Saatleri:**
Pazartesi - Cuma, 09:00 - 18:00 (GMT+3 Türkiye Saati)

Tüm sorulara 3-5 iş günü içinde yanıt vermeyi hedefliyoruz.`
        }
      ]
    }
  }
};
