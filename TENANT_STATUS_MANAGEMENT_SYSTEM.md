# Tenant Status Management System
## Comprehensive Implementation Plan & Requirements

**Document Version:** 1.0  
**Created:** October 11, 2025  
**Status:** Planning Phase  

---

## 🎯 **Project Overview**

This document outlines the comprehensive tenant lifecycle management system for the Immigration Portal. The system will provide manual status control, automated trial expiration, and clear access rules for three tenant states: Trial, Active, and Suspended.

### **Current State**
- 3 tenants total: 2 in Trial mode, 1 Suspended
- No manual status management in Edit Tenant modal
- No automated trial expiration system
- No access control based on tenant status

### **Desired State**
- Full manual status management for Super Admins
- Automated trial expiration after 7 days
- Comprehensive access control rules
- Future-ready for payment integration

---

## 📋 **Core Requirements**

### **1. Manual Status Management**
- **Location:** Edit Tenant modal in Super Admin dashboard
- **Functionality:** Dropdown to change tenant status between Trial, Active, Suspended
- **Access:** Super Admin only
- **Audit:** Log all status changes with timestamps and admin details

### **2. Automated Trial Expiration**
- **Rule:** After 7 free trial days, automatically move tenant to Suspended
- **Grace Period:** 24-hour grace period before hard suspension
- **Notification:** Email alerts before expiration and after suspension
- **Override:** Super Admin can manually override auto-suspension

### **3. Future Payment Integration (Hold)**
- **Planned:** Payment received → Auto-activate tenant
- **Current:** Manual activation only (until payment system is finalized)
- **Timeline:** To be implemented after payment structure is defined

---

## 🔄 **Tenant Status Flow**

```
TRIAL (7 days) → [Auto] → SUSPENDED
     ↓ [Manual]           ↓ [Manual]
  ACTIVE ←────────────────┘
```

### **Status Definitions**

| Status | Description | Duration | Access Level |
|--------|-------------|----------|--------------|
| **TRIAL** | Free trial period | 7 days | Limited features |
| **ACTIVE** | Paid subscription | Unlimited | Full access |
| **SUSPENDED** | Trial expired or manually suspended | Until reactivated | Read-only |

---

## 🛡️ **Access Control Rules**

### **🆓 TRIAL MODE (7 days)**
**✅ ALLOWED:**
- Full access to core features
- User registration and management (max 10 users)
- Document uploads (100MB storage limit)
- Basic analytics/reports (read-only)
- Profile assessment tools
- CRS score calculation
- Support tickets (standard priority)

**⚠️ LIMITATIONS:**
- Storage limit: 100MB per tenant
- User limit: 10 users maximum
- Export restrictions: PDF only, no bulk exports
- Custom branding: Disabled
- Advanced analytics: Read-only mode
- API access: Limited to 100 requests/day

**🚫 BLOCKED:**
- Production deployment
- White-label features
- Advanced integrations
- Priority support
- Bulk operations

### **✅ ACTIVE MODE (Paid Subscription)**
**✅ FULL ACCESS:**
- Unlimited storage (up to plan limits)
- Unlimited users (up to subscription plan)
- Full export capabilities (PDF, Excel, CSV)
- Custom branding and white-label features
- Advanced analytics and reporting
- Full API access (unlimited requests)
- Priority support (24/7)
- All integrations and webhooks
- Production deployment
- Advanced security features

### **🚫 SUSPENDED MODE**
**✅ READ-ONLY ACCESS:**
- View existing data and documents
- Download personal documents
- Basic profile viewing
- Access to billing information

**🚫 BLOCKED:**
- New user registrations
- Document uploads or modifications
- Any data modifications
- New feature access
- Support tickets (except billing inquiries)
- API access
- Export functionality
- All admin functions
- Email notifications (except billing)

---

## 🏗️ **Implementation Phases**

### **Phase 1: Manual Status Management** 🎯 **PRIORITY 1**
**Estimated Time:** 2-3 days

#### **Frontend Changes:**
- [ ] Add status dropdown in Edit Tenant modal
- [ ] Add status change confirmation dialog
- [ ] Update tenant cards to show status with color-coded badges
- [ ] Add status change history in tenant details
- [ ] Implement status-based UI restrictions

#### **Backend Changes:**
- [ ] Create status change API endpoint (`PUT /api/super-admin/tenants/:id/status`)
- [ ] Add status validation and business logic
- [ ] Implement audit logging for status changes
- [ ] Add status change notifications
- [ ] Update tenant model with status fields

#### **Database Updates:**
- [ ] Add status fields to Tenant schema
- [ ] Create status change audit table
- [ ] Add indexes for status-based queries

### **Phase 2: Automated Trial Expiration** 🎯 **PRIORITY 2**
**Estimated Time:** 3-4 days

#### **Background Jobs:**
- [ ] Create trial expiration checker job (daily)
- [ ] Implement grace period logic
- [ ] Add auto-suspension functionality
- [ ] Create status change scheduler

#### **Notification System:**
- [ ] Trial expiration warning emails (3 days, 1 day before)
- [ ] Suspension notification emails
- [ ] Reactivation confirmation emails
- [ ] Admin notification for auto-suspensions

#### **Monitoring & Alerts:**
- [ ] Add trial expiration dashboard
- [ ] Create suspension alerts for admins
- [ ] Implement grace period monitoring

### **Phase 3: Access Control Implementation** 🎯 **PRIORITY 3**
**Estimated Time:** 5-7 days

#### **API Middleware:**
- [ ] Create tenant status middleware
- [ ] Implement feature-based access control
- [ ] Add status-based API restrictions
- [ ] Create usage limit enforcement

#### **Frontend Restrictions:**
- [ ] Hide/disable features based on status
- [ ] Add upgrade prompts for trial users
- [ ] Implement status-based navigation
- [ ] Add usage limit warnings

#### **Feature Flags:**
- [ ] Create feature flag system
- [ ] Map features to tenant statuses
- [ ] Implement dynamic feature enabling/disabling

### **Phase 4: Payment Integration (Future)** 🎯 **PRIORITY 4**
**Estimated Time:** TBD (After payment system design)

#### **Payment Webhooks:**
- [ ] Auto-activate on successful payment
- [ ] Handle payment failures and suspensions
- [ ] Implement subscription renewal logic
- [ ] Add billing cycle management

---

## 📊 **Database Schema Updates**

### **Tenant Model Enhancements:**
```typescript
interface Tenant {
  // Existing fields...
  
  // Status Management
  status: 'trial' | 'active' | 'suspended';
  trialStartDate: Date;
  trialEndDate: Date;
  suspensionDate?: Date;
  lastStatusChange: Date;
  statusChangeReason?: string;
  gracePeriodEnds?: Date;
  
  // Usage Limits
  maxUsers: number;
  storageLimit: number; // in MB
  apiRequestLimit: number; // per day
  
  // Billing (Future)
  subscriptionId?: string;
  planType?: 'basic' | 'standard' | 'premium';
  billingCycle?: 'monthly' | 'yearly';
}
```

### **Status Change Audit Table:**
```typescript
interface TenantStatusChange {
  _id: string;
  tenantId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string; // Admin user ID
  changeReason: string;
  timestamp: Date;
  metadata?: any;
}
```

---

## 🔧 **Technical Implementation Details**

### **API Endpoints:**
```
GET    /api/super-admin/tenants/:id/status-history
PUT    /api/super-admin/tenants/:id/status
POST   /api/super-admin/tenants/:id/extend-trial
GET    /api/super-admin/tenants/expiring-trials
```

### **Background Jobs:**
```
- TrialExpirationChecker (Daily at 2 AM)
- GracePeriodMonitor (Every 6 hours)
- StatusChangeNotifier (Real-time)
- UsageLimitEnforcer (Daily at midnight)
```

### **Middleware Chain:**
```
Authentication → Tenant Resolution → Status Check → Feature Access → Rate Limiting
```

---

## 🎨 **UI/UX Considerations**

### **Status Indicators:**
- **Trial:** Blue badge with clock icon
- **Active:** Green badge with checkmark icon  
- **Suspended:** Red badge with warning icon

### **Warning Banners:**
- Trial expiration warnings (3 days, 1 day, expired)
- Grace period notifications
- Upgrade prompts for trial users

### **Feature Disabling:**
- Gray out unavailable features
- Show tooltips explaining limitations
- Clear upgrade paths for trial users

---

## 🚨 **Security & Compliance**

### **Audit Requirements:**
- Log all status changes with full context
- Maintain 90-day audit trail
- Include IP address and user agent
- Store change reasons and approvals

### **Data Protection:**
- Suspend tenant data retention for 90 days
- Allow data export before permanent deletion
- Implement GDPR compliance for EU tenants
- Secure status change API endpoints

### **Access Control:**
- Super Admin only for status changes
- Role-based access to tenant management
- API rate limiting based on tenant status
- Secure webhook endpoints for future payments

---

## 📈 **Monitoring & Analytics**

### **Key Metrics:**
- Trial to Active conversion rate
- Average trial duration
- Suspension reasons breakdown
- Feature usage by status
- Support ticket volume by status

### **Dashboards:**
- Tenant status overview
- Trial expiration timeline
- Conversion funnel analysis
- Usage limit monitoring

---

## 🔄 **Migration Strategy**

### **Existing Tenants:**
1. Set all current tenants to "trial" status
2. Set trial start date to creation date
3. Set trial end date to creation date + 7 days
4. Send notification about new status system
5. Provide grace period for manual review

### **Data Migration:**
```sql
-- Update existing tenants to trial status
UPDATE tenants 
SET 
  status = 'trial',
  trialStartDate = createdAt,
  trialEndDate = DATE_ADD(createdAt, INTERVAL 7 DAY),
  lastStatusChange = NOW()
WHERE status IS NULL;
```

---

## 📝 **Testing Strategy**

### **Unit Tests:**
- Status change validation
- Trial expiration logic
- Access control middleware
- Notification triggers

### **Integration Tests:**
- End-to-end status flow
- API endpoint functionality
- Background job execution
- Email notification delivery

### **User Acceptance Tests:**
- Super Admin status management workflow
- Tenant experience during trial
- Suspended tenant restrictions
- Reactivation process

---

## 🚀 **Deployment Plan**

### **Pre-deployment:**
- [ ] Database migration scripts
- [ ] Feature flags configuration
- [ ] Email template setup
- [ ] Monitoring dashboard creation

### **Deployment:**
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Run database migrations
- [ ] Enable background jobs
- [ ] Monitor system health

### **Post-deployment:**
- [ ] Verify existing tenant statuses
- [ ] Test status change functionality
- [ ] Monitor trial expirations
- [ ] Collect user feedback

---

## 📞 **Success Criteria**

### **Functional Requirements:**
- ✅ Super Admins can manually change tenant status
- ✅ Trial tenants auto-suspend after 7 days
- ✅ Access control properly restricts features
- ✅ All status changes are audited
- ✅ Notifications are sent for status changes

### **Performance Requirements:**
- Status change API responds in <200ms
- Background jobs complete within 5 minutes
- 99.9% uptime for status management features
- Email notifications delivered within 1 minute

### **Business Requirements:**
- Clear trial to paid conversion path
- Reduced support tickets through clear restrictions
- Improved tenant lifecycle visibility
- Foundation for future payment integration

---

## 📚 **References & Resources**

### **Industry Standards:**
- SaaS trial period best practices
- Multi-tenant access control patterns
- Subscription lifecycle management
- GDPR compliance for SaaS platforms

### **Technical Documentation:**
- Current tenant management system
- Authentication and authorization flow
- Email notification system
- Background job architecture

---

## 🎯 **Next Steps**

1. **Review and approve this document**
2. **Prioritize implementation phases**
3. **Assign development resources**
4. **Create detailed technical specifications**
5. **Begin Phase 1 implementation**

---

**Document Owner:** Development Team  
**Last Updated:** October 11, 2025  
**Next Review:** When ready to begin implementation  

---

*This document serves as the single source of truth for the Tenant Status Management System implementation. All stakeholders should refer to this document for requirements, timelines, and implementation details.*
