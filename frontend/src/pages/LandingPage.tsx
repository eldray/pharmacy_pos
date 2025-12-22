// src/pages/LandingPage.tsx
import React, { useState } from 'react';
import {
  Package,
  ShoppingCart,
  BarChart3,
  Shield,
  Download,
  Play,
  Users,
  Truck,
  Smartphone,
  Calendar,
  FileText,
  Star,
  CheckCircle,
  ArrowRight,
  Zap,
  Heart,
  Pill,
} from 'lucide-react';
import { Login } from '../components/Login';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';

export const LandingPage: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: ShoppingCart,
      title: 'Lightning-Fast POS',
      description: 'Process sales in seconds with intuitive barcode scanning and mobile payment integration',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    },
    {
      icon: Package,
      title: 'Smart Inventory',
      description: 'AI-powered stock tracking with automatic expiry alerts and batch management',
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-green-50',
    },
    {
      icon: BarChart3,
      title: 'Live Analytics',
      description: 'Real-time sales dashboards, profit insights, and customer behavior analytics',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
    },
    {
      icon: Truck,
      title: 'Supplier Network',
      description: 'Automated purchase orders and supplier performance tracking',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-gradient-to-br from-orange-50 to-red-50',
    },
  ];

  const testimonials = [
    {
      name: 'Dr. Kwame Mensah',
      role: 'Pharmacy Owner, Accra',
      quote: 'Increased sales by 40% and eliminated stockouts completely. The analytics helped us optimize our inventory like never before.',
      avatar: 'KM',
      rating: 5,
    },
    {
      name: 'Sarah Addo',
      role: 'Head Pharmacist, Kumasi',
      quote: 'The expiry alert system saved us over ₵50,000 in potential losses. The interface is so intuitive our staff learned it in hours.',
      avatar: 'SA',
      rating: 5,
    },
  ];

  const quickStart = () => setShowDemo(true);

  if (showDemo) return <Login />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PharmacyPOS
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              {['Features', 'Testimonials', 'Pricing', 'Support'].map((item) => (
                <a key={item} href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  {item}
                </a>
              ))}
            </div>
            <Button onClick={quickStart} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-sm font-medium mb-8">
              <Zap className="h-4 w-4 mr-2" />
              Trusted by 500+ pharmacies across Ghana
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Smarter
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Pharmacy
              </span>
              Management
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              The complete <strong className="font-semibold text-gray-900">Point of Sale & Inventory System</strong> built specifically for African pharmacies. 
              Sell faster, track smarter, and grow your business with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" onClick={quickStart} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25">
                <Play className="h-5 w-5 mr-2" />
                Start Free Demo
              </Button>
              <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-blue-500">
                <Download className="h-5 w-5 mr-2" />
                Download App
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              {[
                { number: '500+', label: 'Pharmacies' },
                { number: '99.9%', label: 'Uptime' },
                { number: '24/7', label: 'Support' },
                { number: 'Free', label: 'Updates' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Built for <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Modern Pharmacies</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to run your pharmacy efficiently, from inventory to insights
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index}
                  className={`p-6 border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                    activeFeature === index 
                      ? 'border-blue-500 shadow-xl shadow-blue-500/10' 
                      : 'border-gray-100 hover:border-blue-200'
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`p-3 rounded-2xl w-fit bg-gradient-to-r ${feature.color} mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-3">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-20"></div>
                <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200/60">
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Play className="h-8 w-8" />
                      </div>
                      <p className="text-lg font-semibold">Interactive Demo</p>
                      <p className="text-gray-300 mt-2">Experience PharmacyPOS in action</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                See the Difference in <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">3 Minutes</span>
              </h3>
              <p className="text-lg text-gray-600">
                Our live demo shows you exactly how PharmacyPOS transforms daily operations
              </p>
              
              <ul className="space-y-4">
                {[
                  { Icon: Shield, text: 'Military-grade security for patient data' },
                  { Icon: Calendar, text: 'Automated inventory and expiry management' },
                  { Icon: ShoppingCart, text: 'Process sales 3x faster than before' },
                  { Icon: Heart, text: 'Designed specifically for African pharmacies' },
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item.text}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={quickStart} 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-6"
              >
                Launch Interactive Demo
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Pharmacists</span>
            </h2>
            <p className="text-xl text-gray-600">
              Join hundreds of pharmacies revolutionizing their operations
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8 border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
                      <p className="text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed italic">"{testimonial.quote}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Pharmacy?
          </h2>
          <p className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed">
            Join 500+ successful pharmacies using PharmacyPOS today
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={quickStart}
              className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Free Demo
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10"
            >
              <Download className="h-5 w-5 mr-2" />
              Download for Windows
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm opacity-90 max-w-2xl mx-auto">
            {[
              { Icon: Smartphone, text: 'Works Offline & Online' },
              { Icon: FileText, text: 'Lifetime Free Updates' },
              { Icon: Users, text: 'Dedicated 24/7 Support' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-center gap-3">
                <item.Icon className="h-5 w-5" />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Pill className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">PharmacyPOS</span>
              </div>
              <p className="text-gray-400 max-w-md text-lg">
                Empowering African pharmacies with modern, reliable management solutions.
              </p>
            </div>
            
            {['Product', 'Support', 'Company'].map((title, index) => (
              <div key={index}>
                <h4 className="font-bold text-lg mb-4">{title}</h4>
                <ul className="space-y-3 text-gray-400">
                  {['Features', 'Pricing', 'Download', 'Documentation'].slice(0, 3).map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#" className="hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2025 PharmacyPOS. Built with ❤️ for African pharmacies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
