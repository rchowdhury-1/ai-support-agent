import type { Metadata } from 'next';
import { Newsreader, Schibsted_Grotesk, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';

const serif = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  fallback: ['Georgia', 'serif'],
  adjustFontFallback: false,
});
const sans = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-sans' });
const mono = Spline_Sans_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'SupportAI — Your website, answering customers',
  description:
    "A done-for-you AI assistant for small UK firms, trained on your business's own content. It answers politely, shows its source, and takes a message when it doesn't know.",
};

// Applied before hydration so a saved dark preference never flashes light.
const themeInit = `try{var t=localStorage.getItem('sai-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-sai',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-sai="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${sans.variable} ${serif.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
