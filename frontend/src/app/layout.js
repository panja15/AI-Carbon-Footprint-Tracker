import '../styles/globals.css';
import { AuthProvider } from '../components/AuthProvider';
import Navigation from '../components/Navigation';

export const metadata = {
  title: 'EcoAI - Carbon Footprint Awareness & Coaching Platform',
  description: 'Understand, track, forecast, and simulate carbon emissions. Receive personalized sustainability coaching recommendations using Gemini AI.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div id="app-root">
          <AuthProvider>
            <div className="app-layout">
              <Navigation />
              <main id="main-content" className="main-content">
                {children}
              </main>
            </div>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
