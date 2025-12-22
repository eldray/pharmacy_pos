// src/components/DashboardHome.tsx
import React from 'react';
import { Card } from './ui/Card';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Users, 
  Receipt, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  ArrowUpRight 
} from 'lucide-react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

export const DashboardHome: React.FC = () => {
  const { currentUser, products, transactions } = useAppStore();

  // 🛠️ Handle missing currentUser safely
  const userFirstName = React.useMemo(() => {
    if (!currentUser || !currentUser.name) return 'Guest';
    return currentUser.name.split(' ')[0];
  }, [currentUser]);

  // Calculate dashboard stats
  const stats = React.useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = transactions
      .filter(t => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.total, 0);

    const lowStockItems = products.filter(p => p.quantity < 20).length;
    const totalProducts = products.length;
    const totalTransactions = transactions.length;

    return [
      { 
        label: "Today's Sales", 
        value: `GHS ${todaySales.toFixed(2)}`, 
        icon: DollarSign, 
        color: 'from-green-500 to-emerald-600',
        bgColor: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10',
        borderColor: 'border-green-200',
        change: '+12%'
      },
      { 
        label: 'Low Stock Items', 
        value: lowStockItems.toString(), 
        icon: AlertTriangle, 
        color: 'from-orange-500 to-red-600',
        bgColor: 'bg-gradient-to-br from-orange-500/10 to-red-600/10',
        borderColor: 'border-orange-200',
        change: lowStockItems > 0 ? 'Need attention' : 'All good'
      },
      { 
        label: 'Total Products', 
        value: totalProducts.toString(), 
        icon: Package, 
        color: 'from-blue-500 to-purple-600',
        bgColor: 'bg-gradient-to-br from-blue-500/10 to-purple-600/10',
        borderColor: 'border-blue-200',
        change: '+5%'
      },
      { 
        label: 'Total Transactions', 
        value: totalTransactions.toString(), 
        icon: ShoppingCart, 
        color: 'from-purple-500 to-pink-600',
        bgColor: 'bg-gradient-to-br from-purple-500/10 to-pink-600/10',
        borderColor: 'border-purple-200',
        change: '+8%'
      },
    ];
  }, [products, transactions]);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 🌟 Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {userFirstName}! 👋
            </h1>
            <p className="text-white/80">
              Here's what's happening with your pharmacy today.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span className="font-semibold">Live Dashboard</span>
          </div>
        </div>
      </div>

      {/* 📊 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={i} 
              className={`p-4 border-2 ${stat.borderColor} backdrop-blur-sm bg-white/80 hover:scale-[1.02] transition-all duration-200 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium truncate">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1 truncate">{stat.value}</p>
                  <p className={`text-xs mt-1 font-medium truncate ${
                    stat.change.includes('+') ? 'text-green-600' : 
                    stat.change.includes('Need') ? 'text-orange-600' : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} text-white shadow-lg flex-shrink-0 ml-2`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ⚡ Quick Actions */}
        <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <h3 className="text-base font-semibold mb-3 text-gray-900">Quick Actions</h3>
          <div className="space-y-2">
            {(currentUser?.role === 'admin' || currentUser?.role === 'cashier') && (
              <Link
                to="/dashboard/pos"
                className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-200 text-blue-700 rounded-lg hover:from-blue-500/20 hover:to-purple-600/20 transition-all duration-200 group hover:scale-[1.02]"
              >
                <span className="font-medium text-sm">Start New Sale</span>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  <ArrowUpRight className="h-3 w-3 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            )}
            {(currentUser?.role === 'admin' || currentUser?.role === 'officer') && (
              <>
                <Link
                  to="/dashboard/products"
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-200 text-green-700 rounded-lg hover:from-green-500/20 hover:to-emerald-600/20 transition-all duration-200 group hover:scale-[1.02]"
                >
                  <span className="font-medium text-sm">Manage Products</span>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <ArrowUpRight className="h-3 w-3 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </Link>
                <Link
                  to="/dashboard/inventory"
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-600/10 border border-purple-200 text-purple-700 rounded-lg hover:from-purple-500/20 hover:to-pink-600/20 transition-all duration-200 group hover:scale-[1.02]"
                >
                  <span className="font-medium text-sm">View Inventory</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <ArrowUpRight className="h-3 w-3 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </Link>
              </>
            )}
          </div>
        </Card>

        {/* 🧾 Recent Transactions */}
        <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Recent Transactions</h3>
            <Link 
              to="/dashboard/analytics" 
              className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Receipt className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No recent transactions</p>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div 
                  key={transaction.id || transaction._id} 
                  className="flex items-center justify-between p-2 bg-white/50 rounded-lg border border-gray-100 hover:border-blue-200 transition-all duration-200 group hover:scale-[1.01]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                      {transaction.transactionNumber}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-gray-900 text-sm">GHS {transaction.total.toFixed(2)}</p>
                    <p className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize truncate">
                      {transaction.paymentMethod}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

