import mongoose from 'mongoose';
import { Tenant } from '../Tenant';

export async function addTenantDomainIndex() {
  try {
    console.log('🔍 Adding domain index to Tenant collection...');
    
    // Check if index already exists
    const indexes = await Tenant.collection.getIndexes();
    const domainIndexExists = Object.keys(indexes).some(key => 
      key.includes('domain')
    );
    
    if (domainIndexExists) {
      console.log('✅ Domain index already exists');
      return;
    }
    
    // Create compound index for fast tenant lookups
    await Tenant.collection.createIndex(
      { domain: 1, status: 1 },
      { 
        name: 'domain_status_index',
        background: true 
      }
    );
    
    console.log('✅ Domain index created successfully');
  } catch (error) {
    console.error('❌ Failed to create domain index:', error);
    throw error;
  }
}
