# 201 File Submission - Implementation Plan

## Overview
Enable employees to submit their 201 files (personnel documents) to their organization's HR system. This includes documents like employment contracts, certificates, licenses, training records, and other personnel-related files.

## Prerequisites & Foundation

### ✅ Already Complete
- [x] Multi-tenant organization structure
- [x] Role-based access control (employee, manager, hr_admin)
- [x] User authentication and session management
- [x] Route protection by role
- [x] Database RLS policies for org isolation

### 🔨 Prerequisites to Build First

#### 1. **Database Schema for Documents**
   - **Table:** `employee_documents` (or `personnel_files`)
   - **Purpose:** Store metadata about uploaded files
   - **Fields needed:**
     - `id` (UUID, primary key)
     - `organization_id` (UUID, FK to organizations) - **CRITICAL for multi-tenant**
     - `employee_id` (UUID, FK to auth.users) - who submitted it
     - `document_type` (enum or text) - e.g., 'contract', 'certificate', 'license', 'training', 'other'
     - `title` (text) - user-friendly name
     - `file_name` (text) - original filename
     - `file_path` (text) - path in Supabase Storage
     - `file_size` (bigint) - in bytes
     - `mime_type` (text) - e.g., 'application/pdf', 'image/jpeg'
     - `status` (enum) - 'pending', 'approved', 'rejected' (for future workflow)
     - `submitted_at` (timestamptz)
     - `reviewed_by` (UUID, nullable, FK to auth.users) - HR admin who reviewed
     - `reviewed_at` (timestamptz, nullable)
     - `notes` (text, nullable) - optional notes from employee or HR
     - `created_at`, `updated_at` (timestamptz)

#### 2. **Supabase Storage Setup**
   - **Bucket:** `employee-documents` (or `personnel-files`)
   - **Structure:** `{organization_id}/{employee_id}/{document_id}/{filename}`
   - **RLS Policies:** 
     - Employees can upload to their own folder
     - Employees can view their own documents
     - HR admins/managers can view all documents in their org
   - **File size limits:** Configure max file size (e.g., 10MB per file)
   - **Allowed file types:** PDF, images (JPG, PNG), common document formats

#### 3. **Document Type Categories**
   - Define standard document types (enum or reference table)
   - Common types:
     - `employment_contract` - Employment contract/agreement
     - `resume` - Resume/CV
     - `certificate` - Professional certificates
     - `license` - Professional licenses
     - `training` - Training certificates/completion records
     - `id_document` - Government ID (SSS, TIN, etc.)
     - `medical` - Medical records/clearances
     - `performance_review` - Performance evaluation documents
     - `other` - Miscellaneous documents

#### 4. **File Upload Utilities**
   - Server-side file upload handler
   - Client-side file picker component
   - File validation (size, type, etc.)
   - Progress indicator for uploads
   - Error handling

## Implementation Phases

### Phase 1: Database & Storage Foundation ⚙️
**Goal:** Set up the database schema and Supabase Storage infrastructure

**Tasks:**
1. Create migration for `employee_documents` table
2. Create document type enum (or reference table)
3. Set up Supabase Storage bucket with proper structure
4. Create RLS policies for storage bucket
5. Create RLS policies for `employee_documents` table
6. Create helper functions for file path generation
7. Generate TypeScript types

**Deliverables:**
- Database migration file
- Storage bucket configured
- RLS policies tested
- Type definitions updated

**Estimated Time:** 2-3 hours

---

### Phase 2: File Upload Infrastructure 📤
**Goal:** Build reusable file upload components and server utilities

**Tasks:**
1. Create server utility for file uploads (`src/lib/storage/upload.ts`)
   - Validate file (size, type)
   - Generate secure file paths
   - Upload to Supabase Storage
   - Return file metadata
2. Create server utility for file deletion (`src/lib/storage/delete.ts`)
3. Create file upload component (`src/lib/components/file-upload.svelte`)
   - File picker UI
   - Drag & drop support
   - File preview
   - Upload progress
   - Error handling
4. Create file validation utilities (`src/lib/storage/validation.ts`)
   - File type checking
   - File size validation
   - MIME type validation

**Deliverables:**
- Reusable file upload component
- Server-side upload utilities
- File validation system

**Estimated Time:** 3-4 hours

---

### Phase 3: Document Submission Interface 👤
**Goal:** Allow employees to submit documents through a user-friendly interface

**Tasks:**
1. Create route: `/app/member/documents` (or `/app/member/201-files`)
2. Create page: `+page.svelte`
   - List of submitted documents
   - Upload form
   - Document type selector
   - Title/description input
   - File upload component
3. Create server action: `+page.server.ts`
   - Handle file upload
   - Save document metadata to database
   - Validate permissions (employee can only submit for themselves)
   - Return success/error
4. Create document list component
   - Display submitted documents
   - Show status, type, date submitted
   - Download/view links
   - Delete option (if allowed)

**Deliverables:**
- Employee document submission page
- Document listing interface
- Upload functionality working

**Estimated Time:** 4-5 hours

---

### Phase 4: Document Viewing & Management 👁️
**Goal:** Allow employees and HR to view and manage documents

**Tasks:**
1. Create document viewer/download functionality
   - Server endpoint to generate signed URLs for Supabase Storage
   - Secure file access (verify permissions)
   - PDF viewer component (if needed)
2. Enhance employee view:
   - View own documents
   - Download own documents
   - Edit document metadata (title, type)
   - Delete own documents (with restrictions)
3. Create HR admin view: `/app/admin/documents`
   - View all documents in organization
   - Filter by employee, document type, status
   - Download/view any document
   - Approve/reject workflow (if needed)
4. Create manager view: `/app/manager/documents`
   - View documents for employees in their department/team

**Deliverables:**
- Document viewing interface
- Download functionality
- HR/Manager document management pages

**Estimated Time:** 5-6 hours

---

### Phase 5: Enhanced Features (Optional) 🚀
**Goal:** Add advanced features for better UX and workflow

**Tasks:**
1. **Search & Filtering**
   - Search documents by title, type, employee name
   - Filter by document type, date range, status
2. **Bulk Operations**
   - Bulk upload multiple files
   - Bulk download (zip)
3. **Notifications**
   - Notify HR when employee submits document
   - Notify employee when document is reviewed
4. **Document Versioning**
   - Track document versions
   - Replace old versions
5. **Required Documents**
   - Define required documents per organization
   - Track completion status
   - Reminders for missing documents

**Deliverables:**
- Enhanced search/filter
- Bulk operations
- Notification system
- Document requirements tracking

**Estimated Time:** 8-10 hours (if implementing all)

---

## Security Considerations

### Critical Security Requirements
1. **Multi-tenant Isolation**
   - All queries must filter by `organization_id`
   - RLS policies enforce org boundaries
   - Storage paths include `organization_id`

2. **Access Control**
   - Employees can only upload/view their own documents
   - HR admins can view all documents in their org
   - Managers can view documents for their team (if implemented)
   - Never trust client-side permissions

3. **File Security**
   - Validate file types server-side (never trust client)
   - Scan for malicious files (if possible)
   - Use signed URLs for downloads (time-limited)
   - Store files in private bucket (not public)

4. **Data Privacy**
   - Encrypt sensitive documents (if required by compliance)
   - Audit log who accessed what documents
   - Implement data retention policies

---

## Database Schema Design

### `employee_documents` Table
```sql
CREATE TYPE document_type AS ENUM (
    'employment_contract',
    'resume',
    'certificate',
    'license',
    'training',
    'id_document',
    'medical',
    'performance_review',
    'other'
);

CREATE TYPE document_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

CREATE TABLE employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_size BIGINT NOT NULL, -- Size in bytes
    mime_type TEXT NOT NULL,
    status document_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employee_documents_org ON employee_documents(organization_id);
CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX idx_employee_documents_status ON employee_documents(status);
CREATE INDEX idx_employee_documents_org_employee ON employee_documents(organization_id, employee_id);
```

### RLS Policies
```sql
-- Employees can view their own documents
CREATE POLICY "Employees can view own documents"
    ON employee_documents FOR SELECT
    USING (
        employee_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_memberships
            WHERE user_id = auth.uid()
        )
    );

-- Employees can insert their own documents
CREATE POLICY "Employees can insert own documents"
    ON employee_documents FOR INSERT
    WITH CHECK (
        employee_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_memberships
            WHERE user_id = auth.uid()
        )
    );

-- Employees can update their own documents (limited fields)
CREATE POLICY "Employees can update own documents"
    ON employee_documents FOR UPDATE
    USING (
        employee_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_memberships
            WHERE user_id = auth.uid()
        )
    );

-- HR admins can view all documents in their org
CREATE POLICY "HR admins can view all org documents"
    ON employee_documents FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships
            WHERE user_id = auth.uid() AND role = 'hr_admin'
        )
    );

-- HR admins can update all documents in their org
CREATE POLICY "HR admins can update org documents"
    ON employee_documents FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships
            WHERE user_id = auth.uid() AND role = 'hr_admin'
        )
    );
```

---

## File Structure Plan

```
src/
├── lib/
│   ├── storage/
│   │   ├── upload.ts          # Server-side upload utility
│   │   ├── delete.ts          # Server-side delete utility
│   │   ├── validation.ts      # File validation utilities
│   │   └── paths.ts           # File path generation utilities
│   └── components/
│       ├── file-upload.svelte # File upload component
│       └── document-list.svelte # Document listing component
├── routes/
│   └── app/
│       ├── member/
│       │   └── documents/     # Employee document submission
│       │       ├── +page.svelte
│       │       └── +page.server.ts
│       └── admin/
│           └── documents/     # HR document management
│               ├── +page.svelte
│               └── +page.server.ts
supabase/
└── migrations/
    └── 005_employee_documents.sql
```

---

## Testing Checklist

### Phase 1 Testing
- [ ] Database migration runs successfully
- [ ] Storage bucket created and accessible
- [ ] RLS policies prevent cross-org access
- [ ] RLS policies allow correct access

### Phase 2 Testing
- [ ] File upload works for valid files
- [ ] File validation rejects invalid files
- [ ] File size limits enforced
- [ ] File type restrictions enforced
- [ ] Upload progress displays correctly
- [ ] Error handling works for failed uploads

### Phase 3 Testing
- [ ] Employee can submit document
- [ ] Employee can only submit for themselves
- [ ] Document appears in list after submission
- [ ] Document metadata saved correctly
- [ ] File stored in correct location

### Phase 4 Testing
- [ ] Employee can view own documents
- [ ] Employee can download own documents
- [ ] HR admin can view all org documents
- [ ] HR admin can download any document
- [ ] Signed URLs expire correctly
- [ ] Cross-org access blocked

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Start with Phase 1** - Database schema and storage setup
3. **Iterate incrementally** - Build and test each phase before moving on
4. **Gather feedback** - Test with real users after Phase 3

---

## Questions to Consider

1. **Document Workflow:** Do documents need approval workflow, or are they automatically approved upon submission?
2. **File Size Limits:** What's the maximum file size? (Recommend: 10MB per file)
3. **File Types:** Which file types should be allowed? (Recommend: PDF, images, common docs)
4. **Required Documents:** Should organizations be able to define required documents?
5. **Versioning:** Do we need to track document versions/replacements?
6. **Retention:** How long should documents be kept? Any deletion policies?
7. **Manager Access:** Should managers see documents for their direct reports only, or all employees?

---

## Estimated Total Time

- **Phase 1:** 2-3 hours
- **Phase 2:** 3-4 hours
- **Phase 3:** 4-5 hours
- **Phase 4:** 5-6 hours
- **Phase 5:** 8-10 hours (optional)

**Total (Phases 1-4):** ~14-18 hours
**With Phase 5:** ~22-28 hours

---

## Success Criteria

✅ Employees can submit their 201 files  
✅ Documents are securely stored per organization  
✅ Employees can view/download their own documents  
✅ HR admins can view/download all documents in their org  
✅ Multi-tenant isolation is enforced  
✅ File uploads are validated and secure  
✅ UI is user-friendly and intuitive  

