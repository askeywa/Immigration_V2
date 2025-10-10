import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { superAdminApi } from '@/services/superAdminApi';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  UserGroupIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'super_admin' | 'tenant_admin' | 'tenant_user';
  status: 'active' | 'inactive' | 'suspended';
  tenant?: {
    name: string;
    domain: string;
  };
  createdAt: string;
  lastLogin?: string;
}

const SuperAdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    const saved = localStorage.getItem('userListViewMode');
    return (saved === 'card' || saved === 'list') ? saved : 'card';
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const itemsPerPage = 12;
  
  // Statistics state (for all users, not just current page)
  const [userStats, setUserStats] = useState({
    total: 0,
    tenantAdmins: 0,
    tenantUsers: 0,
    superAdmins: 0
  });

  // Load data only once on mount
  useEffect(() => {
    fetchUsers();
  }, []); // Empty dependency array - load only once on mount

  const fetchUsers = async () => {
    try {
      console.log('🔄 SuperAdminUsers: Starting fetchUsers...', new Date().toISOString());
      setLoading(true);
      
      // Fetch ALL users for client-side filtering and pagination
      // Removed cache-busting parameter to enable backend caching
      const response = await superAdminApi.get(`/super-admin/users?page=1&limit=1000`); // Get all users
      console.log('📥 SuperAdminUsers: API response:', response);
      console.log('👥 SuperAdminUsers: Users data:', response.data?.data?.users);
      console.log('📄 SuperAdminUsers: Pagination data:', response.data?.pagination);
      
      // CRITICAL: Extract pagination FIRST before setting users
      const paginationData = response.data?.pagination || {};
      const usersData = response.data?.data?.users || [];
      
      // Set all state in proper order
      setUsers(usersData); // Now contains ALL users
      setTotalPages(paginationData.totalPages || 1);
      setTotalUsers(paginationData.totalUsers || paginationData.totalCount || usersData.length);
      
      // Calculate user statistics from loaded data
      const stats = {
        total: usersData.length,
        tenantAdmins: usersData.filter(u => u.role === 'tenant_admin').length,
        tenantUsers: usersData.filter(u => u.role === 'tenant_user').length,
        superAdmins: usersData.filter(u => u.role === 'super_admin').length,
      };
      setUserStats(stats);
      console.log('📊 SuperAdminUsers: Updated user statistics:', stats);
      
      console.log('📊 SuperAdminUsers: Pagination set:', {
        totalPages: paginationData.totalPages,
        totalUsers: paginationData.totalUsers,
        currentPage: currentPage,
        shouldShowPagination: (paginationData.totalPages || 1) > 1
      });
      
      // Ensure DOM updates complete before hiding loader
      setTimeout(() => {
        setLoading(false);
        console.log('✅ SuperAdminUsers: Fetch complete...', new Date().toISOString());
      }, 100);
      
    } catch (error) {
      console.error('❌ SuperAdminUsers: Error fetching users:', error);
      setLoading(false);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to load users: ${errorMessage}\n\nPlease try refreshing the page.`);
      
      // Set empty state to prevent UI issues
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    }
  };


  // User management functions
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };


  // Client-side filtering for search only
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (user.tenant?.name && user.tenant.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    
    // Debug logging
    if (debouncedSearchTerm !== '') {
      console.log(`🔍 Users search debug - User: "${user.firstName} ${user.lastName}", Email: "${user.email}", Tenant: "${user.tenant?.name}"`);
      console.log(`🔍 Search term: "${debouncedSearchTerm}", Matches: ${matchesSearch}`);
    }
    
    return matchesSearch;
  });
  
  // Debug: Log filtering results
  console.log(`🔍 Users filtering results: ${users.length} total users, ${filteredUsers.length} after filtering`);

  // Client-side pagination for filtered results
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  const totalFilteredPages = Math.ceil(filteredUsers.length / itemsPerPage);
  
  // Debug: Log pagination results
  console.log(`🔍 Users pagination debug - Page: ${currentPage}, Items per page: ${itemsPerPage}, Start: ${startIndex}, End: ${endIndex}`);
  console.log(`🔍 Paginated users: ${paginatedUsers.length} users to display`);
  console.log(`🔍 Current search term: "${searchTerm}", Debounced: "${debouncedSearchTerm}"`);
  console.log(`🔍 Component re-rendering with ${paginatedUsers.length} users to display`);

  // Debounce search term
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchTerm, debouncedSearchTerm]);

  // Reset to page 1 when search changes (client-side filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Force re-render when search term changes
  useEffect(() => {
    console.log(`🔍 Users search term changed to: "${searchTerm}" (debounced: "${debouncedSearchTerm}")`);
  }, [searchTerm, debouncedSearchTerm]);

  // Persist view mode changes to localStorage
  useEffect(() => {
    localStorage.setItem('userListViewMode', viewMode);
  }, [viewMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            
            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                    </div>
                    <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Search and filter skeleton */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="w-48 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="w-20 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            
            {/* User cards skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                      <div>
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 min-h-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">User Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage all users across all tenants, monitor activity, and oversee permissions.</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and View Toggle */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              {isSearching ? (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" data-testid="search-spinner">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" data-testid="search-icon" />
              )}
              <Input
                placeholder="Search users by name, email, or tenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1" role="group" aria-label="View mode toggle">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                data-testid="view-mode-card"
                className={`px-3 py-2 ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="view-mode-list"
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <ListBulletIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Users Display */}
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8" key={`users-grid-${debouncedSearchTerm}`}>
            {paginatedUsers.map((user) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 min-w-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Information - Prominent */}
                  {user.tenant && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Tenant:</span>
                        <span className="text-sm text-blue-800 dark:text-blue-200 font-semibold truncate">
                          {user.tenant.name}
                        </span>
                      </div>
                      {user.tenant.domain && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 truncate">
                          {user.tenant.domain}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between min-w-0">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">Created:</span>
                      <span className="text-sm text-gray-900 dark:text-white flex-shrink-0">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between min-w-0">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">Admin:</span>
                      <span className="text-sm text-gray-900 dark:text-white flex-shrink-0">
                        {user.tenant?.name || 'undefined'}
                      </span>
                    </div>
                    {user.lastLogin && (
                      <div className="flex items-center justify-between min-w-0">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">Last Login:</span>
                        <span className="text-sm text-gray-900 dark:text-white flex-shrink-0">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewUser(user)}
                      data-testid={`user-view-button-${user._id}`}
                      className="w-full flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 dark:border-gray-600"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600" key={`users-table-${debouncedSearchTerm}`}>
                  {paginatedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-3">
                            <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.tenant ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.tenant.name}
                            </div>
                            {user.tenant.domain && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.tenant.domain}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">No tenant</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.tenant?.name || 'undefined'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          data-testid={`user-view-button-${user._id}`}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {(totalFilteredPages && totalFilteredPages > 1) ? (
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalFilteredPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalFilteredPages))}
                disabled={currentPage === totalFilteredPages}
                className="dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Next
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* Empty State */}
        {paginatedUsers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm 
                ? 'Try adjusting your search criteria.' 
                : 'Get started by adding your first user.'}
            </p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="user-details-modal-title">User Details</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              {/* Tenant Information */}
              {selectedUser.tenant && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Tenant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tenant Name</label>
                      <p className="text-gray-900 dark:text-white">{selectedUser.tenant.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Domain</label>
                      <p className="text-gray-900 dark:text-white">{selectedUser.tenant.domain}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Information */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                    <p className="text-gray-900 dark:text-white">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Login</label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowUserModal(false)}
                className="dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUsers;