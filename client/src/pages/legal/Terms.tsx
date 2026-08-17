import { useState, useEffect } from 'react';
import { legalTranslations } from '@/locales/legal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Download, Globe, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

export default function Terms() {
  const [language, setLanguage] = useState<'en' | 'tr'>('en');
  const [activeSection, setActiveSection] = useState<string>('intro');
  
  const content = legalTranslations[language].terms;

  useEffect(() => {
    // Detect browser language preference
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('tr')) {
      setLanguage('tr');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = content.sections.map(s => s.id);
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [content.sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home">
                <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-bold" data-testid="text-terms-title">{content.title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')}
              data-testid="button-language-toggle"
            >
              <Globe className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Türkçe' : 'English'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents - Sticky Sidebar */}
          <aside className="lg:col-span-1 print:hidden">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Table of Contents</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <nav className="space-y-1 p-4">
                      {content.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors hover-elevate ${
                            activeSection === section.id
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          data-testid={`link-toc-${section.id}`}
                        >
                          {section.title}
                        </button>
                      ))}
                    </nav>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-3xl" data-testid="text-document-title">
                    {content.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground" data-testid="text-last-updated">
                    Last Updated: {content.lastUpdated}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                {content.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="mb-12 scroll-mt-24"
                    data-testid={`section-${section.id}`}
                  >
                    <h2 className="text-2xl font-bold mb-4 text-foreground">
                      {section.title}
                    </h2>
                    <div className="text-foreground/90 whitespace-pre-line leading-relaxed">
                      {section.content}
                    </div>
                  </section>
                ))}

                {/* Footer Contact */}
                <div className="mt-12 pt-8 border-t">
                  <p className="text-sm text-muted-foreground">
                    {language === 'en' 
                      ? 'If you have any questions about these Terms of Service, please contact us at ' 
                      : 'Bu Hizmet Şartları hakkında sorularınız varsa, lütfen '}
                    <a 
                      href="mailto:legal@lilove.org" 
                      className="text-primary hover:underline"
                      data-testid="link-email-legal"
                    >
                      legal@lilove.org
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          header, aside, button {
            display: none !important;
          }
          main {
            width: 100% !important;
            max-width: 100% !important;
          }
          .prose {
            font-size: 11pt;
            line-height: 1.5;
          }
          h1 {
            font-size: 18pt;
            page-break-after: avoid;
          }
          h2 {
            font-size: 14pt;
            page-break-after: avoid;
            margin-top: 20pt;
          }
          section {
            page-break-inside: avoid;
          }
          a {
            text-decoration: underline;
            color: black;
          }
        }
      `}</style>
    </div>
  );
}
