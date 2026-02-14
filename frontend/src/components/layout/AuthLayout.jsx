import { Outlet } from 'react-router-dom';
import { Sparkles, FileText, MessageSquare, Shield } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Smart Document Processing',
    description: 'Upload PDFs, DOCs, and more. Our AI extracts and indexes content automatically.',
  },
  {
    icon: MessageSquare,
    title: 'Intelligent Q&A',
    description: 'Ask questions in natural language and get accurate answers from your documents.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Your data is encrypted and secure. We never share your documents with third parties.',
  },
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] dark:bg-slate-900 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full" />
        </div>

        {/* Content */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Knowledge AI</h1>
              <p className="text-sm text-blue-200">Enterprise Assistant</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Transform your documents into intelligent answers
          </h2>
          <p className="text-xl text-blue-100 leading-relaxed mb-12">
            Upload your company documents and let AI help you find answers instantly. Built for teams who value efficiency.
          </p>

          <div className="space-y-6">
            {features.map((feature, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-blue-200 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-sm text-blue-200">
          Trusted by professionals worldwide
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Knowledge AI
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              Enterprise Assistant
            </p>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
