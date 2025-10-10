// backend/src/scripts/migrate-tenant-domains.ts
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateTenantDomains() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || '';
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔄 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database:', mongoose.connection.name);

    // Step 1: Add customDomains and domainApprovals fields to all tenants
    console.log('\n📝 Step 1: Adding new fields to existing tenants...');
    const result = await Tenant.updateMany(
      {
        customDomains: { $exists: false }
      },
      {
        $set: {
          customDomains: [],
          domainApprovals: []
        }
      }
    );

    console.log(`✅ Migration complete: ${result.modifiedCount} tenants updated`);

    // Step 2: For Honey & Wild specifically, add their custom domain
    console.log('\n📝 Step 2: Configuring Honey & Wild tenant...');
    const honeynwild = await Tenant.findOne({ 
      $or: [
        { domain: /honeynwild/i },
        { name: /honey.*wild/i }
      ]
    });
    
    if (honeynwild) {
      console.log(`✅ Found Honey & Wild tenant:`, {
        _id: honeynwild._id,
        name: honeynwild.name,
        domain: honeynwild.domain,
        status: honeynwild.status
      });

      // Check if honeynwild.com is already in customDomains
      if (!honeynwild.customDomains.includes('honeynwild.com')) {
        honeynwild.customDomains.push('honeynwild.com');
        console.log('✅ Added honeynwild.com to customDomains');
      } else {
        console.log('ℹ️  honeynwild.com already in customDomains');
      }
      
      // Check if approval already exists
      const approvalExists = honeynwild.domainApprovals.some(
        (approval: any) => approval.domain === 'honeynwild.com'
      );
      
      if (!approvalExists) {
        honeynwild.domainApprovals.push({
          domain: 'honeynwild.com',
          status: 'approved',
          requestedAt: new Date(),
          approvedAt: new Date(),
        });
        console.log('✅ Added domain approval for honeynwild.com');
      } else {
        console.log('ℹ️  Domain approval already exists for honeynwild.com');
      }
      
      await honeynwild.save();
      console.log('✅ Honey & Wild configuration saved');
      
      // Display final configuration
      console.log('\n📋 Final Honey & Wild Configuration:');
      console.log('   Name:', honeynwild.name);
      console.log('   Primary Domain:', honeynwild.domain);
      console.log('   Custom Domains:', honeynwild.customDomains);
      console.log('   Status:', honeynwild.status);
      console.log('   Domain Approvals:', honeynwild.domainApprovals.map((a: any) => ({
        domain: a.domain,
        status: a.status
      })));
    } else {
      console.log('⚠️  Honey & Wild tenant not found in database');
      console.log('ℹ️  You may need to create the tenant first or check the tenant name/domain');
    }

    // Step 3: List all tenants with custom domains
    console.log('\n📋 Step 3: All tenants with custom domains:');
    const tenantsWithCustomDomains = await Tenant.find({
      customDomains: { $exists: true, $ne: [] }
    }).select('name domain customDomains status');

    if (tenantsWithCustomDomains.length > 0) {
      tenantsWithCustomDomains.forEach(tenant => {
        console.log(`   - ${tenant.name}: ${tenant.domain} + [${tenant.customDomains.join(', ')}]`);
      });
    } else {
      console.log('   No tenants with custom domains yet');
    }

    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Build and deploy backend: npm run build');
    console.log('   2. Restart backend server');
    console.log('   3. Test tenant login from honeynwild.com');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run migration
console.log('🚀 Starting Tenant Domain Migration');
console.log('=' .repeat(60));
migrateTenantDomains();

