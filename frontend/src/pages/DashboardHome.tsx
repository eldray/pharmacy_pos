// src/components/DashboardHome.tsx
import React from 'react';
import { Card } from './ui/Card';
import { ShoppingCart, Package, DollarSign, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

export const DashboardHome: React.FC = () => {
  const { currentUser, products, transactions } = useAppStore();

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
        color: 'text-green-600',
        change: '+12%'
      },
      { 
        label: 'Low Stock Items', 
        value: lowStockItems.toString(), 
        icon: AlertTriangle, 
        color: 'text-orange-600',
        change: lowStockItems > 0 ? 'Need attention' : 'All good'
      },
      { 
        label: 'Total Products', 
        value: totalProducts.toString(), 
        icon: Package, 
        color: 'text-blue-600',
        change: '+5%'
      },
      { 
        label: 'Total Transactions', 
        value: totalTransactions.toString(), 
        icon: ShoppingCart, 
        color: 'text-purple-600',
        change: '+8%'
      },
    ];
  }, [products, transactions]);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {currentUser?.name.split(' ')[0]}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your pharmacy today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${
                    stat.change.includes('+') ? 'text-green-600' : 
                    stat.change.includes('Need') ? 'text-orange-600' : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {(currentUser?.role === 'admin' || currentUser?.role === 'cashier') && (
              <Link
                to="/dashboard/pos"
                className="flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span>Start New Sale</span>
                <ShoppingCart className="h-5 w-5" />
              </Link>
            )}
            {(currentUser?.role === 'admin' || currentUser?.role === 'officer') && (
              <>
                <Link
                  to="/dashboard/products"
                  className="flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <span>Manage Products</span>
                  <Package className="h-5 w-5" />
                </Link>
                <Link
                  to="/dashboard/inventory"
                  className="flex items-center justify-between p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <span>View Inventory</span>
                  <TrendingUp className="h-5 w-5" />
                </Link>
              </>
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <Link 
              to="/dashboard/analytics" 
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent transactions</p>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.transactionNumber}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">GHS {transaction.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 capitalize">{transaction.paymentMethod}</p>
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
