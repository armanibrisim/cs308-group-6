# LUMEN Online Store - Detailed Sprint Plan

## Project Overview

**Project:** LUMEN - Online Tech Store  
**Team:** CS 308 Group 6  
**Duration:** 5 Sprints (2 weeks each)  
**Start Date:** March 13, 2026  
**Progress Demo:** ~May 1, 2026 (will be rescheduled)  
**Final Demo:** TBA  

**Tech Stack:**
- Frontend: Next.js (React) with TypeScript
- Backend: FastAPI (Python)
- Database: Firebase (Firestore)

---

## Sprint Schedule

| Sprint | Planning Date | Start Date | Review & Retrospective |
|--------|---------------|------------|------------------------|
| Sprint 1 | March 13, 2026 | March 13, 2026 | March 27, 2026 |
| Sprint 2 | March 20, 2026 | March 27, 2026 | April 10, 2026 |
| Sprint 3 | April 3, 2026 | April 10, 2026 | April 24, 2026 |
| Sprint 4 | April 17, 2026 | April 24, 2026 | May 15, 2026 |
| Sprint 5 | May 8, 2026 | May 15, 2026 | May 22, 2026 |

---

## SPRINT 1 (March 13 - March 27, 2026)
### Goal: Project Foundation & Basic Product Browsing

### Backend Team Tasks:

**Project Setup & Infrastructure**
- Create main repository structure and initialize FastAPI project with proper structure
- Set up Firebase project and Firestore database
- Configure backend environment variables (.env files)
- Set up Git branching strategy and protection rules

**Development Environment**
- Install and configure backend dependencies
- Configure Black, isort for Python code formatting
- Set up pytest testing framework

**Database Schema Design**
- Design Firestore collections structure:
  - users (with role field: customer/sales_manager/product_manager)
  - products (with required fields from Feature 9)
  - categories, orders, order_items, reviews, delivery_lists, invoices, wishlists
- Create initial Pydantic data models matching exact requirements

**Authentication System (Feature 10)**
- Implement user registration and login endpoints with JWT tokens
- Create password hashing utilities (bcrypt)
- Implement role-based access control (Customer, Sales Manager, Product Manager)
- Create authentication middleware/dependencies for FastAPI
- Create user repository and service layers

**Product Management Foundation (Feature 9)**
- Define Product Pydantic models with exact required properties:
  - ID, name, model, serial number, description, quantity in stocks, price, warranty status, distributor information
- Implement product repository and service layers with basic CRUD operations
- Design category structure for tech products and implement category CRUD
- Create product and category API endpoints

**Basic Search & Sort (Feature 7)**
- Implement backend search endpoints (name/description search)
- Create sorting endpoints (price-based: low to high, high to low)
- Add popularity-based sorting logic
- Handle out-of-stock product filtering in API responses

### Frontend Team Tasks:

**Project Setup & Infrastructure**
- Initialize Next.js project with TypeScript
- Configure frontend environment variables (.env.local files)
- Set up project folder structure according to RULES.md

**Development Environment**
- Install and configure frontend dependencies
- Configure ESLint, Prettier for code formatting
- Set up Jest testing framework with React Testing Library

**Authentication System (Feature 10)**
- Create login/register pages with form validation
- Implement authentication context for state management
- Create protected route components
- Handle JWT token storage and management (localStorage/cookies)
- Create authentication service for API calls

**Product Browsing Frontend (Feature 1)**
- Create product listing page with grid/list view
- Implement category-based filtering UI
- Create product card component with stock display
- Implement pagination for product lists
- Create detailed product view page displaying all product information
- Show stock availability and implement breadcrumb navigation

**Basic Search & Sort (Feature 7)**
- Create search bar component and search results page
- Implement search functionality with API integration
- Create sort dropdown component (price, popularity)
- Handle out-of-stock product display in UI
- Add loading states and error handling

### Shared/Integration Tasks:

**API Integration**
- Backend: Document API endpoints and response formats
- Frontend: Create API service layer to consume backend endpoints
- Both: Test authentication flow end-to-end
- Both: Test product browsing and search functionality integration

**Testing**
- Backend: Write unit tests for authentication, product CRUD, search/sort APIs
- Frontend: Write component tests for authentication, product browsing, search components
- Both: Integration testing for API-frontend communication

### Sprint 1 Deliverables
- Complete project setup and working authentication system
- Product browsing with categories and basic search/sort functionality
- Unit tests for implemented features (backend API tests + frontend component tests)
- Bug reports documented as needed
- 15+ product backlog items and 30+ sprint backlog items

---

## SPRINT 2 (March 27 - April 10, 2026)
### Goal: Shopping Cart & Stock Management

### Backend Team Tasks:

**Shopping Cart System (Feature 1)**
- Design cart/session management data models
- Implement cart item models and create cart repository layer
- Create cart service with add/remove/update operations
- Implement guest cart (session-based) and cart persistence for logged-in users
- Handle cart merging on login and implement cart expiration logic
- Create cart API endpoints (GET, POST, PUT, DELETE)

**Stock Management System (Feature 3)**
- Implement stock quantity tracking in database
- Create stock update operations and validation logic
- Add stock validation for cart operations (prevent overselling)
- Implement stock reservation during checkout process
- Create stock management API endpoints
- Add stock history tracking in database

**Order Processing Foundation (Feature 3)**
- Design order data structure with proper relationships
- Implement order creation process and validation logic
- Create order status management (processing, in-transit, delivered)
- Handle stock deduction on order placement
- Create order API endpoints
- Implement order status update functionality

**Admin Interface APIs (Feature 8 & 12)**
- Create product manager authentication endpoints
- Implement product CRUD API endpoints
- Create category management API endpoints
- Build stock adjustment API endpoints
- Add bulk stock update API functionality
- Create low stock alerts API

### Frontend Team Tasks:

**Shopping Cart System (Feature 1)**
- Create cart sidebar/drawer component
- Implement cart item component with quantity controls
- Add cart summary component and create cart page with full cart view
- Add "Add to Cart" buttons on product pages
- Implement cart context for state management
- Add cart item count indicator in header
- Handle real-time cart synchronization with backend

**Stock Management Display (Feature 3)**
- Show stock quantities on product pages
- Implement out-of-stock indicators and styling
- Add low stock warnings in UI
- Disable "Add to Cart" for out-of-stock items
- Create stock status components

**Order Processing Frontend (Feature 3)**
- Create checkout page with order summary
- Implement shipping address collection form
- Add order confirmation step and success page
- Create order history page for customers
- Implement order status display components

**Admin Interface Frontend (Feature 8 & 12)**
- Create product manager login/dashboard pages
- Implement product CRUD interface (forms, tables, modals)
- Create category management interface
- Build stock adjustment interface with bulk operations
- Create stock history and low stock alerts UI
- Implement admin navigation and layout

### Shared/Integration Tasks:

**API Integration**
- Backend: Document cart, stock, order, and admin API endpoints
- Frontend: Create service layers for cart, stock, order, and admin operations
- Both: Test cart operations end-to-end (add, update, remove, checkout)
- Both: Test stock management and admin interface integration

**Real-time Updates**
- Backend: Implement real-time stock updates (WebSocket or polling)
- Frontend: Handle real-time cart and stock synchronization
- Both: Test concurrent user scenarios for cart and stock operations

**Testing**
- Backend: Unit tests for cart service, stock management, order processing, admin APIs
- Frontend: Component tests for cart UI, checkout flow, admin interfaces
- Both: Integration testing for complete cart-to-order flow

### Sprint 2 Deliverables
- Complete shopping cart system and stock management with real-time updates
- Basic order processing and product manager admin interface
- Unit tests for implemented features (backend services + frontend components)
- Integration testing for cart-to-order flow
- Bug reports documented as needed

---

## SPRINT 3 (April 10 - April 24, 2026)
### Goal: Payment, Invoicing & Email System

### Backend Team Tasks:

**Payment System (Feature 4 & 14)**
- Design credit card data structure with encryption
- Implement payment processing models and validation logic
- Create mock banking entity integration
- Implement credit card encryption at rest using proper encryption libraries
- Create payment audit logging system
- Build payment API endpoints (process payment, validate card)
- Handle payment success/failure scenarios in API

**Invoice System (Feature 4)**
- Design invoice data structure with all required fields
- Implement invoice creation service
- Add invoice PDF generation using libraries (ReportLab/WeasyPrint)
- Create invoice template design and formatting
- Build invoice storage system in Firestore
- Implement invoice retrieval and search functionality
- Add invoice number generation logic

**Email System (Feature 4)**
- Set up email service provider integration (SendGrid/AWS SES)
- Implement email sending service
- Create email templates for invoices
- Add email queue management for reliable delivery
- Create email API endpoints

**Order Status & Tracking (Feature 3)**
- Implement order status update functionality
- Create delivery tracking system in database
- Add status change notification triggers
- Build order history API endpoints
- Create order cancellation API with stock restoration

**Reviews & Ratings System (Feature 5)**
- Implement review data models (rating 1-5 stars, comment, approval status)
- Create review submission API endpoints
- Implement review approval workflow for product managers
- Add review retrieval endpoints (approved reviews only for customers)
- Create review management API for product managers

### Frontend Team Tasks:

**Payment System (Feature 4 & 14)**
- Implement payment form with credit card validation
- Create secure credit card information collection UI
- Build payment confirmation flow and success/failure pages
- Add payment loading states and error handling
- Implement payment security best practices in UI

**Invoice System (Feature 4)**
- Create invoice display component for post-purchase
- Implement invoice viewing interface
- Add invoice download functionality
- Create invoice history page for customers

**Email Integration (Feature 4)**
- Handle email confirmation UI after purchase
- Create email status indicators
- Add resend invoice email functionality

**Order Status & Tracking (Feature 3)**
- Build order history interface for customers
- Create order details view with status tracking
- Implement order status display components (processing, in-transit, delivered)
- Add order cancellation functionality in UI
- Create status change notifications/alerts

**Reviews & Ratings System (Feature 5)**
- Create review submission form with star rating component
- Implement rating display components (stars visualization)
- Add review listing on product pages (approved reviews only)
- Create review management interface for product managers
- Build review approval/rejection UI for product managers

### Shared/Integration Tasks:

**Payment Flow Integration**
- Backend: Ensure secure payment processing and invoice generation
- Frontend: Complete checkout flow from cart to payment to invoice
- Both: Test complete purchase flow end-to-end
- Both: Handle payment errors and edge cases

**Email Delivery Testing**
- Backend: Test email service integration and delivery
- Frontend: Test email confirmation and status updates
- Both: Verify invoice PDF generation and email attachment

**Review System Integration**
- Backend: Test review submission and approval workflow
- Frontend: Test review display and management interfaces
- Both: Verify review approval process from submission to display

**Testing**
- Backend: Unit tests for payment processing, invoice generation, email services, review APIs
- Frontend: Component tests for payment forms, invoice display, review components
- Both: End-to-end testing for complete purchase and review flows

### Sprint 3 Deliverables
- Complete payment and checkout system with invoice generation and email delivery
- Order status tracking and reviews/ratings system with approval workflow
- Unit tests for implemented features (backend services + frontend components)
- End-to-end testing for complete purchase flow
- Bug reports documented as needed

---

## SPRINT 4 (April 24 - May 15, 2026)
### Goal: Advanced Features & Progress Demo Preparation

### Backend Team Tasks:

**Wishlist System (Features 11 & 13)**
- Create wishlist data models in Firestore
- Implement wishlist CRUD operations (add, remove, get user wishlists)
- Create wishlist API endpoints
- Implement wishlist notification system for discounts
- Add wishlist integration with user accounts

**Discount & Pricing System (Feature 11)**
- Implement discount management system in database
- Create discount calculation logic and pricing updates
- Add discount API endpoints for sales managers
- Implement automatic price updates when discounts are applied
- Create notification system for wishlist users when products are discounted
- Handle discount-aware pricing in all product APIs

**Sales Analytics (Feature 11)**
- Implement revenue calculation between dates
- Create profit/loss calculation logic
- Add date range filtering for financial reports
- Build analytics API endpoints for sales managers
- Create data aggregation for charts and reports

**Invoice Management (Feature 11)**
- Create invoice listing API for sales managers
- Add date range filtering for invoice queries
- Implement invoice PDF saving functionality
- Create invoice printing API endpoints
- Add invoice search and filtering capabilities

### Frontend Team Tasks:

**Wishlist System (Features 11 & 13)**
- Create wishlist components (add/remove buttons, wishlist page)
- Implement wishlist management interface for customers
- Add wishlist notifications for discount alerts
- Create wishlist integration in product pages

**Discount & Pricing System (Feature 11)**
- Create sales manager dashboard for discount management
- Implement discount creation and management forms
- Add promotional pricing display throughout the site
- Create discount notification UI components
- Build price adjustment interface for sales managers

**Sales Analytics (Feature 11)**
- Build charts for revenue/profit visualization using chart libraries
- Create analytics dashboard for sales managers
- Implement date range picker for reports
- Add financial reporting interface with export capabilities

**Invoice Management (Feature 11)**
- Create invoice listing interface for sales managers
- Add date range filtering UI for invoices
- Implement invoice viewing and printing functionality
- Create invoice search and filtering interface

**Professional Interface (Feature 6)**
- Improve overall design consistency across all pages
- Add loading animations and transitions
- Optimize mobile responsiveness for all components
- Enhance user experience flows and navigation
- Polish UI components and styling

### Shared/Integration Tasks:

**Progress Demo Features Completion**
- Backend: Ensure all APIs for features 1,3,4,5,7,9 are stable and tested
- Frontend: Verify all UI components for demo features work properly
- Both: Test complete user flows for demo features:
  - Product browsing with categories ✓
  - Stock management + order status tracking ✓
  - Guest cart + login to checkout + invoice email ✓
  - Comments & ratings with approval ✓
  - Search + sort + out-of-stock handling ✓
  - Complete product fields ✓

**Wishlist and Discount Integration**
- Backend: Test discount notifications to wishlist users
- Frontend: Test wishlist functionality and discount displays
- Both: Verify end-to-end wishlist and discount workflows

**Sales Manager Dashboard Integration**
- Backend: Ensure all sales manager APIs are properly secured
- Frontend: Test complete sales manager dashboard functionality
- Both: Verify analytics, invoice management, and discount features

**Progress Demo Preparation**
- Backend: Prepare stable demo environment with test data
- Frontend: Ensure demo scenarios work smoothly
- Both: Create demo script, prepare demo data and products
- Both: Test all demo features thoroughly and create presentation materials

### Sprint 4 Deliverables
- Complete wishlist functionality and sales manager dashboard with analytics
- Discount and pricing management system
- Progress demo ready with all required features (1,3,4,5,7,9)
- Professional UI/UX improvements
- **PROGRESS DEMO REQUIREMENTS:**
  - At least 25 new unit test cases for progress demo
  - At least 5 new bug reports for progress demo
  - At least 5 commits per member for progress demo
  - At least 15 product backlog items maintained
  - At least 30 sprint backlog items for progress demo

---

## SPRINT 5 (May 15 - May 22, 2026)
### Goal: Final Features & Production Ready

### Backend Team Tasks:

**Returns & Refund System (Feature 15)**
- Implement return request system with 30-day policy validation
- Create refund calculation logic with original purchase price
- Handle discount-aware refund logic (refund with discount applied)
- Add sales manager refund evaluation workflow APIs
- Implement stock restoration on approved returns
- Create return/refund API endpoints

**Delivery Management (Feature 12)**
- Complete delivery list with required properties (delivery ID, customer ID, product ID, quantity, total price, delivery address, completion status)
- Implement delivery completion tracking system
- Create delivery management API endpoints for product managers
- Add delivery address handling and validation

**Security Hardening (Feature 16)**
- Audit encryption implementation for passwords, credit cards, invoices, user accounts
- Review and strengthen role-based security privileges
- Test user role separation (customers, sales managers, product managers)
- Implement additional defensive programming practices
- Conduct security vulnerability assessment

**Multi-user Support (Feature 17)**
- Implement proper concurrency handling for database operations
- Handle race conditions in stock management with proper locking
- Test concurrent user scenarios with multiple roles
- Ensure system retains functionality under concurrent access
- Optimize database queries for concurrent operations

**Performance Optimization**
- Optimize database queries and implement caching strategies
- Add database indexing for frequently queried fields
- Implement API response caching where appropriate
- Add performance monitoring and logging

### Frontend Team Tasks:

**Returns & Refund System (Feature 15)**
- Create return request interface for customers
- Implement return history and status tracking
- Build sales manager refund evaluation interface
- Add refund status display and notifications
- Create return product selection from order history

**Delivery Management (Feature 12)**
- Create delivery management interface for product managers
- Implement delivery status tracking and completion UI
- Add delivery address display and editing
- Build delivery list with filtering and search

**Security & User Experience (Feature 16)**
- Ensure secure handling of sensitive data in UI
- Implement proper form validation and sanitization
- Add security indicators and user feedback
- Test role-based UI access controls

**Performance Optimization**
- Optimize frontend bundle size and implement code splitting
- Add performance monitoring (Core Web Vitals)
- Implement lazy loading for images and components
- Optimize rendering performance and memory usage

**Multi-user Support (Feature 17)**
- Test UI behavior under concurrent user scenarios
- Implement proper loading states for concurrent operations
- Add conflict resolution UI for concurrent edits
- Ensure responsive UI under high load

### Shared/Integration Tasks:

**Returns & Refund Integration**
- Backend: Test return request processing and stock restoration
- Frontend: Test complete return/refund user flow
- Both: Verify 30-day policy enforcement and discount-aware refunds

**Delivery Management Integration**
- Backend: Test delivery tracking and completion workflows
- Frontend: Test delivery management interface for product managers
- Both: Verify delivery list properties and functionality

**Security Testing**
- Backend: Perform penetration testing and vulnerability assessment
- Frontend: Test XSS prevention and secure data handling
- Both: Verify role-based access controls across all features

**Performance & Concurrency Testing**
- Backend: Load testing with multiple concurrent users
- Frontend: Performance testing and optimization verification
- Both: Test system stability under concurrent access

**Final Testing & Documentation**
- Backend: Complete API documentation and deployment scripts
- Frontend: Create user manuals and deployment guides
- Both: End-to-end testing of all 17 features
- Both: Final bug fixes and production readiness verification

**Final Demo Preparation**
- Backend: Prepare production-ready environment
- Frontend: Final UI polish and demo scenarios
- Both: Complete system testing and demo preparation

### Sprint 5 Deliverables
- Complete returns and refund system with 30-day policy
- Full delivery management system for product managers
- Security hardening and performance optimizations
- All 17 features implemented and production-ready
- **FINAL DEMO REQUIREMENTS:**
  - At least 25 new unit test cases for final demo
  - At least 5 new bug reports for final demo
  - At least 5 commits per member for final demo
  - At least 15 product backlog items maintained
  - At least 30 sprint backlog items for final demo
- Production-ready system with documentation

---

## Feature Implementation Priority

### Progress Demo Requirements (Features 1,3,4,5,7,9):
1. ✅ **Feature 1**: Present products in categories, shopping cart functionality
2. ✅ **Feature 3**: Limited stock display, stock decrease on purchase, order status (processing, in-transit, delivered)
3. ✅ **Feature 4**: Browse without login, login for checkout, payment confirmation, invoice display & PDF email
4. ✅ **Feature 5**: Comments and ratings (1-5 stars), product manager approval required
5. ✅ **Feature 7**: Search by name/description, sort by price/popularity, out-of-stock handling
6. ✅ **Feature 9**: Product properties (ID, name, model, serial number, description, quantity, price, warranty, distributor)

### Final Demo Additional Features:
7. **Feature 2**: Store design for chosen product type
8. **Feature 6**: Attractive, easy-to-use, professional GUI
9. **Feature 8**: Website browsing/purchasing + admin interface for management
10. **Feature 10**: Three user roles (customers, sales managers, product managers)
11. **Feature 11**: Sales managers - price setting, discounts, wishlist notifications, invoice viewing/printing, revenue/profit charts
12. **Feature 12**: Product managers - add/remove products/categories, stock management, delivery management, comment approval
13. **Feature 13**: Customers - view/search/comment/rate products, wishlists, orders, cancellations, returns (ID, name, tax ID, email, address, password)
14. **Feature 14**: Credit card information entry for purchases
15. **Feature 15**: Product returns within 30 days, sales manager refund evaluation, stock restoration, discount-aware refunds
16. **Feature 16**: Security for registration/payment, role privileges, encrypted sensitive data (passwords, credit cards, invoices, accounts)
17. **Feature 17**: Smooth operation, concurrency support for multiple users

---

## Demo Requirements & Grading

### Progress Demo (~May 1, 2026 - will be rescheduled)
**Demo Presentation (80% of demo grade):**
- Features 1, 3, 4, 5, 7, and 9 must be fully working
- Product browsing with categories
- Stock management + order status tracking  
- Guest cart + login to checkout + invoice email (PDF)
- Comments & ratings with manager approval
- Search + sort (price/popularity) + out-of-stock handling
- Product fields: ID, name, model, serial number, description, stock qty, price, warranty, distributor

**Development Activities (20% of demo grade):**
- At least 5 commits per member per demo (18% of 20%)
- At least 25 new unit test cases per demo (18% of 20%)
- At least 5 new bug reports per demo (18% of 20%)
- At least 15 product backlog items per demo (18% of 20%)
- At least 30 sprint backlog items per demo (18% of 20%)
- Attendance in the SCRUM meetings (10% of 20%)

### Final Demo (TBA)
**Demo Presentation (80% of demo grade):**
- All 17 features must be complete and working

**Development Activities (20% of demo grade):**
- At least 5 commits per member per demo (18% of 20%)
- At least 25 new unit test cases per demo (18% of 20%)
- At least 5 new bug reports per demo (18% of 20%)
- At least 15 product backlog items per demo (18% of 20%)
- At least 30 sprint backlog items per demo (18% of 20%)
- Attendance in the SCRUM meetings (10% of 20%)

### Overall Project Grading
- **Progress Demo:** 20% of final course grade
- **Final Demo:** 30% of final course grade

This plan ensures all course requirements from Course_Project.pdf are met while maintaining high code quality and following agile best practices.