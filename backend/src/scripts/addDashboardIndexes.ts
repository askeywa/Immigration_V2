// backend/src/scripts/addDashboardIndexes.ts
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { log } from '../utils/logger';

export async function addDashboardIndexes() {
  try {
    console.log('🔍 Adding dashboard performance indexes...');
    
    // Critical indexes for analytics queries
    console.log('📊 Adding User indexes...');
    
    // Index for lastLogin queries (daily/weekly/monthly active users)
    await User.collection.createIndex(
      { lastLogin: 1 }, 
      { 
        name: 'lastLogin_index', 
        background: true,
        partialFilterExpression: { lastLogin: { $exists: true } }
      }
    );
    
    // Index for createdAt queries (new users metrics)
    await User.collection.createIndex(
      { createdAt: 1 }, 
      { name: 'createdAt_index', background: true }
    );
    
    // Compound index for tenant-specific user analytics
    await User.collection.createIndex(
      { tenantId: 1, lastLogin: 1 }, 
      { name: 'tenantId_lastLogin_index', background: true }
    );
    
    // Compound index for tenant-specific user creation analytics
    await User.collection.createIndex(
      { tenantId: 1, createdAt: 1 }, 
      { name: 'tenantId_createdAt_index', background: true }
    );
    
    // Index for active user queries
    await User.collection.createIndex(
      { isActive: 1, lastLogin: 1 }, 
      { name: 'isActive_lastLogin_index', background: true }
    );
    
    console.log('📊 Adding Tenant indexes...');
    
    // Index for subscription revenue calculations
    await Tenant.collection.createIndex(
      { 'subscription.status': 1, 'subscription.amount': 1 }, 
      { 
        name: 'subscription_status_amount_index', 
        background: true,
        partialFilterExpression: { 'subscription.amount': { $exists: true, $gt: 0 } }
      }
    );
    
    // Index for active tenants
    await Tenant.collection.createIndex(
      { status: 1, createdAt: 1 }, 
      { name: 'status_createdAt_index', background: true }
    );
    
    // Index for subscription metrics
    await Tenant.collection.createIndex(
      { 'subscription.status': 1, 'subscription.startDate': 1 }, 
      { name: 'subscription_status_startDate_index', background: true }
    );
    
    console.log('✅ Dashboard indexes created successfully');
    log.info('Dashboard performance indexes added', {
      userIndexes: 5,
      tenantIndexes: 3,
      totalIndexes: 8
    });
    
    return {
      success: true,
      message: 'Dashboard indexes created successfully',
      indexesAdded: {
        user: 5,
        tenant: 3,
        total: 8
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to create dashboard indexes:', error);
    log.error('Failed to create dashboard indexes', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Function to check existing indexes
export async function checkDashboardIndexes() {
  try {
    console.log('🔍 Checking existing dashboard indexes...');
    
    const userIndexes = await User.collection.getIndexes();
    const tenantIndexes = await Tenant.collection.getIndexes();
    
    const requiredUserIndexes = [
      'lastLogin_index',
      'createdAt_index', 
      'tenantId_lastLogin_index',
      'tenantId_createdAt_index',
      'isActive_lastLogin_index'
    ];
    
    const requiredTenantIndexes = [
      'subscription_status_amount_index',
      'status_createdAt_index',
      'subscription_status_startDate_index'
    ];
    
    const missingUserIndexes = requiredUserIndexes.filter(indexName => 
      !Object.keys(userIndexes).some(key => key.includes(indexName.replace('_index', '')))
    );
    
    const missingTenantIndexes = requiredTenantIndexes.filter(indexName => 
      !Object.keys(tenantIndexes).some(key => key.includes(indexName.replace('_index', '')))
    );
    
    console.log('📊 Index Status:');
    console.log('  User indexes:', Object.keys(userIndexes).length, 'total');
    console.log('  Tenant indexes:', Object.keys(tenantIndexes).length, 'total');
    console.log('  Missing User indexes:', missingUserIndexes.length);
    console.log('  Missing Tenant indexes:', missingTenantIndexes.length);
    
    return {
      userIndexes: Object.keys(userIndexes).length,
      tenantIndexes: Object.keys(tenantIndexes).length,
      missingUserIndexes,
      missingTenantIndexes,
      allIndexesPresent: missingUserIndexes.length === 0 && missingTenantIndexes.length === 0
    };
    
  } catch (error) {
    console.error('❌ Failed to check dashboard indexes:', error);
    throw error;
  }
}

// Export for use in other scripts
export default { addDashboardIndexes, checkDashboardIndexes };
