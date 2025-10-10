// backend/src/scripts/runIndexCreation.ts
import { connectDatabase } from '../config/database';
import { addDashboardIndexes, checkDashboardIndexes } from './addDashboardIndexes';
import { log } from '../utils/logger';

async function runIndexCreation() {
  try {
    console.log('🚀 Starting dashboard index creation process...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');
    
    // Check existing indexes first
    console.log('\n📊 Checking existing indexes...');
    const indexStatus = await checkDashboardIndexes();
    
    if (indexStatus.allIndexesPresent) {
      console.log('✅ All required dashboard indexes are already present!');
      return;
    }
    
    console.log(`\n🔧 Creating ${indexStatus.missingUserIndexes.length + indexStatus.missingTenantIndexes.length} missing indexes...`);
    
    // Add missing indexes
    const result = await addDashboardIndexes();
    
    console.log('\n🎉 Index creation completed successfully!');
    console.log(`✅ Added ${result.indexesAdded.total} indexes`);
    
    // Verify indexes were created
    console.log('\n🔍 Verifying indexes...');
    const finalStatus = await checkDashboardIndexes();
    
    if (finalStatus.allIndexesPresent) {
      console.log('✅ All dashboard indexes verified successfully!');
    } else {
      console.log('⚠️ Some indexes may not have been created properly');
      console.log('Missing User indexes:', finalStatus.missingUserIndexes);
      console.log('Missing Tenant indexes:', finalStatus.missingTenantIndexes);
    }
    
    log.info('Dashboard index creation completed', {
      indexesAdded: result.indexesAdded,
      allPresent: finalStatus.allIndexesPresent
    });
    
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    log.error('Dashboard index creation failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  runIndexCreation();
}

export default runIndexCreation;
