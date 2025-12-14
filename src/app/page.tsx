import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { CheckCircle, UploadCloud, Bot, FileText, Feather } from 'lucide-react';
import {PlaceHolderImages} from '@/lib/placeholder-images'
import { Logo } from '@/components/logo';

const features = [
  {
    icon: <UploadCloud className="w-10 h-10 text-accent" />,
    title: 'Analyze Your Handwriting',
    description: 'Upload a sample of your handwriting, and our AI will create a unique digital model of your style.',
  },
  {
    icon: <FileText className="w-10 h-10 text-accent" />,
    title: 'Input Any Content',
    description: 'Type, paste, or upload documents. LiqAI extracts the text and prepares it for handwriting generation.',
  },
  {
    icon: <Bot className="w-10 h-10 text-accent" />,
    title: 'Generate Authentic Results',
    description: "Our AI generates your assignment in your handwriting, complete with natural imperfections for a truly human touch.",
  },
];

const pricingTiers = [
    {
        name: 'Free',
        price: '$0',
        description: 'Get a taste of the future of handwriting.',
        features: [
            '3 handwriting generations per month',
            '1 handwriting style analysis',
            'Basic support',
        ],
        cta: 'Start for Free',
        href: '/signup',
        primary: false,
    },
    {
        name: 'Premium',
        price: '$10',
        description: 'Unlock the full power of LiqAI.',
        features: [
            'Unlimited handwriting generations',
            'Unlimited style analyses',
            'Save generated documents',
            'Priority support',
        ],
        cta: 'Go Premium',
        href: '/signup',
        primary: true,
    }
]

export default function Home() {
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

  return (
    <div className="flex flex-col min-h-dvh">
      <Header />
      <main className="flex-1">
        <section className="relative w-full pt-32 pb-20 md:pt-48 md:pb-32 flex items-center justify-center text-center">
            <div className="absolute inset-0 z-0">
                {heroImage && <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    fill
                    className="object-cover opacity-10"
                    data-ai-hint={heroImage.imageHint}
                    priority
                />}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
            </div>
            <div className="container px-4 md:px-6 z-10">
                <div className="flex flex-col items-center space-y-6">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter font-headline animate-neon-glow">
                        Your Handwriting,
                        <br />
                        Digitally Perfected.
                    </h1>
                    <p className="max-w-[700px] text-muted-foreground md:text-xl">
                        LiqAI transforms your typed text into authentic handwritten documents using a personalized AI model of your own handwriting.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button size="lg" asChild variant="glow">
                            <Link href="/signup">Start for Free</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                    <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-accent font-medium">Key Features</div>
                    <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">How It Works</h2>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        A seamless three-step process to bring your digital text to life with a personal, handwritten touch.
                    </p>
                </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
                {features.map((feature, index) => (
                    <div key={index} className="grid gap-4 p-6 rounded-lg transition-all hover:scale-105 hover:border-accent border">
                        <div className="flex items-center gap-4">
                            {feature.icon}
                            <h3 className="text-lg font-bold font-headline">{feature.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/10">
             <div className="container px-4 md:px-6">
                 <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                        <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-accent font-medium">Pricing</div>
                        <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">Choose Your Plan</h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            Simple and transparent pricing. Get started for free.
                        </p>
                    </div>
                </div>
                <div className="mx-auto grid max-w-md items-start gap-8 sm:max-w-4xl sm:grid-cols-2 mt-12">
                    {pricingTiers.map((tier) => (
                        <Card key={tier.name} className={`flex flex-col ${tier.primary ? 'border-accent' : ''}`}>
                            <CardHeader>
                                <CardTitle className="font-headline">{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 grid gap-6">
                                <div className="text-4xl font-bold font-headline">{tier.price}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                                <ul className="grid gap-2 text-sm text-muted-foreground">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-accent" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button asChild className="w-full" variant={tier.primary ? 'glow' : 'default'}>
                                    <Link href={tier.href}>{tier.cta}</Link>
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
             </div>
        </section>
      </main>
      <footer className="w-full p-6 md:px-8 md:py-12 border-t">
        <div className="container mx-auto flex items-center justify-between">
            <Logo />
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LiqAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
