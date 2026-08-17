# CLAUDE.md

# Field Sales Intelligence Platform

## 1. Project Overview

This project is a web-based Field Sales Intelligence and Dealer Management Platform for an automobile-industry business.

The business has a distributed sales team that travels across India and meets automobile retail dealers, distributors, workshops, accessory shops, and other business partners.

The primary problem is that management currently has limited visibility into:

- How many dealers each salesman meets every day
- Which dealers were visited
- Where the salesman travelled
- Which dealers are new or existing
- What was discussed during the meeting
- Which products the dealer is interested in
- Which distributor the dealer currently works with
- Which opportunities are active
- Which follow-ups are pending
- Which dealers were converted
- Salesman productivity
- Dealer coverage across cities and states
- Distributor/dealer relationships
- Overall sales activity across India

The platform should solve this problem while keeping the experience extremely simple for travelling salesmen.

---

# 2. Core Product Philosophy

## Most important principle

> Salesmen should NOT have to use a complicated CRM.

The salesman should be able to use WhatsApp as the primary interface.

A salesman can send:

- Text
- Voice messages
- Visiting cards
- Contact cards
- Images
- Dealer/shop photos
- Locations
- Documents
- Follow-up information

The system should use AI and business rules to convert this unstructured information into structured business data.

### Desired salesman experience

```text
Meet Dealer
    ↓
Open WhatsApp
    ↓
Send whatever information is available
    ↓
System understands it
    ↓
System records the visit/dealer/follow-up
    ↓
Salesman receives confirmation
```

The salesman should not need to manually fill a large form after every dealer visit.

---

# 3. Product Vision

The platform should become the company's central source of truth for field sales activity.

It should answer questions such as:

- Where are our salesmen?
- How many dealers did each salesman meet today?
- How many new dealers were discovered?
- Which dealers are interested in our products?
- Which opportunities are high priority?
- Which follow-ups are overdue?
- Which cities have poor dealer coverage?
- Which distributors are associated with which dealers?
- Which salesmen are performing well?
- Which dealers have not been visited recently?
- What happened during the last visit?
- Which dealers are likely to convert?
- What action should the salesman take next?

---

# 4. Primary Users

## 4.1 Salesman

A field employee who travels across cities/states and meets dealers.

The salesman should primarily interact with the system through WhatsApp.

The salesman should be able to:

- Record a dealer visit
- Add a new dealer
- Share a visiting card
- Share a WhatsApp contact
- Send voice notes
- Send photos
- Send location
- Record dealer interest
- Record product requirements
- Record competitor information
- Create/update follow-ups
- Ask for pending follow-ups
- Receive reminders
- Receive confirmation that information was recorded

---

## 4.2 Manager / Management

Management uses the web application.

Management should be able to:

- View all salesmen
- View salesman activity
- View dealer database
- View distributor database
- View visits
- View follow-ups
- View opportunities
- View maps
- View state/city activity
- View salesman performance
- View dealer coverage
- View inactive dealers
- View high-value opportunities
- View overdue follow-ups
- Search/filter/export data

---

## 4.3 Admin

Admin manages the system.

Admin responsibilities may include:

- User management
- Salesman management
- Distributor management
- Dealer management
- Product management
- Roles and permissions
- WhatsApp configuration
- AI configuration
- System settings
- Audit logs

---

# 5. Organizational Structure

The business operates through multiple distributors across India.

Distributors may operate in:

- Multiple states
- Multiple cities
- Multiple territories

Salesmen may interact with dealers associated with different distributors.

Basic relationship:

```text
Business
   │
   ├── Salesmen
   │
   ├── Distributors
   │       │
   │       └── Dealers
   │
   └── Products
```

However, the database must not assume that every dealer has only one permanent distributor.

Distributor relationships should be modeled so they can change over time if the business requires it.

---

# 6. Dealer

A dealer is a retail/business customer or potential customer.

Dealer information may include:

- Dealer name
- Business/shop name
- Contact persons
- Mobile numbers
- WhatsApp numbers
- Email
- Address
- City
- State
- Pincode
- Latitude
- Longitude
- GST information if available
- Distributor
- Salesman relationship
- Products of interest
- Current suppliers/distributors
- Competitors
- Dealer status
- Last visit
- Next follow-up
- Notes
- Documents
- Photos

Dealer records must support both:

- Existing dealers
- New/prospect dealers

---

# 7. Dealer Status

Dealer status should be configurable.

Possible initial statuses:

- Prospect
- New
- Active
- Inactive
- Converted
- Lost

Do not hard-code business statuses where configuration is more appropriate.

---

# 8. Dealer Contacts

A dealer may have multiple contacts.

Example:

```text
Sharma Auto
    │
    ├── Rajesh Sharma - Owner
    ├── Amit - Purchase
    └── Rahul - Manager
```

Contact information should be stored separately from the main dealer where appropriate.

---

# 9. Salesman-to-Dealer Relationship

A salesman may meet many dealers.

A dealer may also be visited by multiple salesmen.

Do not assume:

```text
1 dealer = 1 salesman
```

unless the business explicitly establishes this rule.

Visit history must preserve who actually visited the dealer.

---

# 10. Dealer Visit

A visit represents an interaction between a salesman and a dealer.

A visit may contain:

- Salesman
- Dealer
- Date/time
- Location
- City
- State
- Visit notes
- Products discussed
- Dealer interest
- Requirements
- Competitor information
- Current supplier/distributor
- Opportunity
- Follow-up
- Attachments
- AI-generated summary

Example:

```text
Salesman:
Rahul

Dealer:
Sharma Auto

Location:
Indore, Madhya Pradesh

Date:
17 August 2026

Discussion:
PPF requirement

Interest:
High

Current Supplier:
ABC Distributor

Next Action:
Send quotation

Follow-up:
21 August 2026
```

---

# 11. Visit Location

Whenever location information is available, preserve:

- Latitude
- Longitude
- Timestamp
- Location source

Location may come from:

- WhatsApp location
- Browser location
- Manually provided location
- Dealer address/geocoding

The system must distinguish between:

- Dealer location
- Salesman's current location
- Visit location

Do not assume these are always identical.

---

# 12. Follow-ups

Follow-ups are actions that need to happen after a dealer interaction.

Examples:

- Send quotation
- Send price list
- Call dealer
- Send product catalog
- Arrange sample
- Arrange demonstration
- Contact distributor
- Revisit dealer
- Confirm order
- Collect payment

A follow-up should support:

- Dealer
- Salesman
- Description
- Due date
- Priority
- Status
- Created from visit
- Completed date
- Completion notes

Possible statuses:

- Pending
- Due Today
- Completed
- Overdue
- Cancelled

---

# 13. Opportunities

An opportunity represents a potential business opportunity with a dealer.

An opportunity may contain:

- Dealer
- Salesman
- Product
- Estimated quantity
- Estimated value
- Interest level
- Probability
- Stage
- Expected closing date
- Notes
- Source visit

Possible initial stages:

```text
New
Interested
Quotation Sent
Negotiation
Confirmed
Lost
```

These stages should remain configurable.

---

# 14. Product Interest

The system should record which products a dealer is interested in.

Example:

```text
Dealer:
Sharma Auto

Products:

PPF
Interest: High

Window Film
Interest: Medium

Interior PPF
Interest: Low
```

Product interest may be extracted from:

- Text
- Voice
- Images
- Documents
- Visit notes

---

# 15. WhatsApp as the Salesman Interface

The application will use the company's WhatsApp number as the primary field-data collection interface.

Salesmen will send information to the company's WhatsApp number.

MessageAutoSender will receive/process WhatsApp messages and forward incoming events to the application's webhook.

---

# 16. MessageAutoSender

MessageAutoSender is the initial WhatsApp gateway.

The existing paid MessageAutoSender service provides:

- WhatsApp messaging
- Incoming message webhook
- Outgoing message API
- Media file URLs
- Message types
- Sender information
- Receiver information
- Message timestamps
- Contact/vCard information
- Location information

Do not introduce Meta WhatsApp Cloud API unless a concrete requirement appears that MessageAutoSender cannot satisfy.

---

# 17. WhatsApp Architecture

```text
Salesman
    ↓
WhatsApp
    ↓
MessageAutoSender
    ↓
Webhook
    ↓
Next.js
    ↓
Store Raw Message
    ↓
Processing Pipeline
    ↓
AI
    ↓
Business Rules
    ↓
Database
    ↓
WhatsApp Confirmation
```

---

# 18. MessageAutoSender Webhook

Webhook endpoint:

```text
POST /api/webhooks/messageautosender
```

The webhook is responsible for:

1. Receiving the event
2. Validating the request
3. Identifying inbound/outbound direction
4. Identifying the salesman
5. Preventing duplicate processing
6. Persisting the raw message
7. Returning a successful response quickly

The webhook should NOT perform expensive AI processing synchronously.

---

# 19. MessageWebhook Fields

MessageAutoSender provides fields including:

```text
id
channelId
receiverNumber
receiverName
senderNumber
senderName
authorId
authorName
boundType
itemType
value
time
caption
isForwarded
fileName
filePath
```

Important meanings:

### id

Unique external message ID.

Must be stored and used for idempotency.

Never process the same external message ID twice.

### channelId

MessageAutoSender channel.

Store it because multiple channels may exist in the future.

### senderNumber

The sender's WhatsApp number.

This should be used to identify the salesman.

### senderName

Display name from WhatsApp.

Do not use this as the primary identity because names can change.

### boundType

Determines inbound/outbound direction.

Inbound messages should be considered for salesman data processing.

Outbound messages generated by the system should not be processed as new salesman input.

### itemType

Determines message type.

The application must support all relevant MessageAutoSender message types.

### value

Contains:

- Text content for text messages
- Latitude/longitude for locations
- vCard content for contact messages
- Multi-vCard content for multiple contacts

### time

Message timestamp in milliseconds.

Convert carefully and preserve the original timestamp.

### caption

Caption associated with media/contact/location.

### filePath

Remote file URL for supported media.

The application should copy important files into its own storage.

---

# 20. WhatsApp Message Types

The system should support, where available:

- Text
- Image
- Audio
- Voice/PTT
- Video
- Document
- Location
- vCard
- Multi-vCard
- Interactive/button messages where supported

Do not assume all message types are available until confirmed from MessageAutoSender's exact enum.

---

# 21. WhatsApp Sender Identification

Salesmen must be registered with their WhatsApp number.

Example:

```text
Salesman:
Rahul

Phone:
919888888888
```

Incoming webhook:

```text
senderNumber:
919888888888
```

System:

```text
senderNumber
    ↓
salesmen.phone_number
    ↓
Rahul
```

A salesman must not have to identify themselves in every message.

---

# 22. WhatsApp Session / Conversation

Multiple messages sent close together may belong to one dealer visit.

Example:

```text
10:31
Visiting card

10:32
Voice note

10:33
Location
```

These should potentially be processed as one visit rather than three separate visits.

The application should maintain a conversation/session concept.

Do not assume every message equals one visit.

---

# 23. Raw Message Storage

Every webhook message should be stored before AI processing.

Store:

- External message ID
- Session ID
- Salesman ID
- Sender number
- Receiver number
- Channel ID
- Direction
- Item type
- Value
- Caption
- File name
- File path
- Timestamp
- Raw webhook payload
- Processing status
- Created timestamp

Possible processing states:

```text
received
processing
processed
failed
ignored
```

---

# 24. AI Processing

AI is responsible for understanding unstructured salesman communication.

AI may perform:

- Intent detection
- Text extraction
- Voice transcription
- Visiting-card extraction
- Contact extraction
- Dealer extraction
- Location interpretation
- Product extraction
- Interest detection
- Follow-up extraction
- Opportunity extraction
- Summary generation

AI should NOT directly write unrestricted data to the database.

Architecture:

```text
Raw Input
    ↓
AI
    ↓
Structured JSON
    ↓
Schema Validation
    ↓
Business Rules
    ↓
Database
```

---

# 25. AI Confidence

AI-generated information should have confidence where appropriate.

Example:

```text
Dealer name:
Sharma Auto
Confidence:
0.96
```

If confidence is low for critical information, the system should ask the salesman for clarification.

Example:

> I found two dealers named Sharma Auto in Indore. Which one did you visit?

---

# 26. AI Should Ask Only Necessary Questions

The AI should minimize friction.

If the salesman sends:

```text
Met Sharma Auto in Indore.
New dealer.
Interested in PPF.
Send quotation Friday.
```

The system should not ask unnecessary questions.

It should extract:

```text
Dealer = Sharma Auto
City = Indore
Status = New
Product = PPF
Interest = High
Follow-up = Friday
```

Then confirm.

Only missing/ambiguous important information should trigger a question.

---

# 27. Visiting Card Processing

When a salesman sends a visiting card image:

```text
Image
    ↓
Storage
    ↓
AI Vision/OCR
    ↓
Extract:
    Dealer name
    Contact person
    Phone
    Email
    Address
    GST if available
    Designation
```

Extracted information must be validated before creating/updating a dealer.

---

# 28. vCard Processing

If `itemType` is vCard:

The system should parse the vCard directly.

Do not use OCR unnecessarily.

Extract:

- Name
- Phone
- Email
- Organization
- Address
- Designation where available

Then perform dealer/contact matching.

---

# 29. Voice Message Processing

For audio/voice messages:

```text
WhatsApp
    ↓
Webhook
    ↓
filePath
    ↓
Download
    ↓
Storage
    ↓
Speech-to-text
    ↓
AI extraction
```

Example:

Salesman:

> "Aaj Sharma Auto gaya tha, PPF mein interested hain, Friday ko quotation bhejna hai."

AI:

```text
Dealer: Sharma Auto
Product: PPF
Interest: High
Follow-up: Friday
Action: Send quotation
```

---

# 30. Location Processing

For location messages:

`value` contains latitude and longitude.

Example:

```text
19.08252,72.74075
```

Store:

```text
latitude
longitude
timestamp
source
```

If useful, reverse geocode to:

```text
City
State
Area
Address
```

Do not overwrite a dealer's official address simply because a salesman shared a location.

The location may represent the salesman/visit location.

---

# 31. Dealer Duplicate Detection

The system must avoid blindly creating duplicate dealers.

Matching priority may include:

1. Exact phone number
2. Exact WhatsApp number
3. GST number
4. Strong name + city match
5. Name + address similarity
6. Other business identifiers

If strong match:

```text
Existing Dealer
    ↓
Update
```

If uncertain:

```text
Possible duplicate
    ↓
Ask for confirmation
```

If no match:

```text
Create new dealer
```

---

# 32. Business Rules Must Override AI

AI is an interpretation layer.

Business rules are authoritative.

Example:

```text
AI:
Dealer = Sharma Auto

Database:
Two Sharma Auto dealers exist in Indore.

Result:
Do not automatically create/update.

Ask user to select dealer.
```

---

# 33. Outbound Message Handling

When the application sends:

```text
✅ Visit recorded
```

MessageAutoSender may send an outbound webhook.

The webhook must recognize:

```text
boundType = out
```

and avoid treating it as salesman input.

---

# 34. Outgoing WhatsApp Messages

The application can use MessageAutoSender's:

```text
POST /api/v1/message/create
```

for outgoing messages.

Use a dedicated server-side integration layer.

Do not expose MessageAutoSender credentials to the browser.

Example internal service:

```text
lib/
  integrations/
    messageautosender/
      client.ts
      sendMessage.ts
```

---

# 35. Authentication

Use Supabase Auth for web application users.

Roles should be configurable.

Initial roles:

```text
admin
manager
salesman
```

Use Row Level Security where appropriate.

Salesmen should only have access to data they are authorized to see.

Managers should see data according to their organizational scope.

Admins can manage system-wide configuration.

---

# 36. Core Database Entities

Initial entities:

```text
users
salesmen
distributors
dealers
dealer_contacts
products
visits
visit_products
opportunities
followups
whatsapp_sessions
whatsapp_messages
ai_extractions
attachments
audit_logs
```

Additional entities can be introduced when required.

Do not create unnecessary tables prematurely.

---

# 37. Suggested Relationships

```text
Salesman
   │
   ├── Visits
   ├── Followups
   ├── Opportunities
   └── WhatsApp Sessions

Dealer
   │
   ├── Contacts
   ├── Visits
   ├── Opportunities
   ├── Followups
   └── Attachments

Distributor
   │
   └── Dealer Relationships

WhatsApp Session
   │
   └── WhatsApp Messages

WhatsApp Message
   │
   └── AI Extraction

Visit
   │
   ├── Dealer
   ├── Salesman
   ├── Products
   ├── Opportunity
   └── Followups
```

---

# 38. Web Application Modules

The web application should initially contain:

## Dashboard

Show:

- Total dealers
- New dealers
- Visits today
- Visits this week
- Active salesmen
- Pending follow-ups
- Overdue follow-ups
- Active opportunities
- Dealer coverage
- Recent activity

---

## Salesmen

Show:

- Salesman list
- Daily visits
- Weekly visits
- Monthly visits
- Dealers visited
- New dealers
- Follow-ups
- Opportunities
- Geographic activity

---

## Dealers

Features:

- Dealer list
- Search
- Filters
- Dealer profile
- Contacts
- Visit history
- Follow-ups
- Opportunities
- Distributor
- Location
- Activity timeline

---

## Distributors

Features:

- Distributor list
- State
- City
- Dealer count
- Sales activity
- Associated dealers
- Performance where applicable

---

## Visits

Features:

- Visit list
- Date
- Salesman
- Dealer
- Location
- Summary
- Products
- Opportunity
- Follow-up

---

## Follow-ups

Features:

- Today's follow-ups
- Upcoming
- Overdue
- Completed
- Salesman
- Dealer
- Priority

---

## Opportunities

Features:

- Pipeline
- Dealer
- Product
- Salesman
- Stage
- Value
- Probability
- Expected close date

---

# 39. Dealer Profile

The dealer profile should become one of the most important screens.

Example:

```text
Sharma Auto
Indore, Madhya Pradesh

Status:
Active

Distributor:
ABC Distributor

Contacts:
Rajesh Sharma
+91 XXXXX XXXXX

Products:
PPF - High
Window Film - Medium

Last Visit:
17 Aug 2026

Next Follow-up:
21 Aug 2026

Salesman:
Rahul
```

Then an activity timeline:

```text
17 Aug
Visited by Rahul
PPF discussed

15 Aug
Quotation sent

10 Aug
Phone call

01 Aug
Dealer created
```

---

# 40. Management Dashboard

Management should be able to understand the business without reading individual WhatsApp conversations.

Dashboard should provide:

- Salesman activity
- Dealer acquisition
- Dealer coverage
- Geographic distribution
- Product interest
- Opportunities
- Follow-up status
- Distributor performance
- Activity trends

---

# 41. Maps

Maps can be used to visualize:

- Dealers
- Visits
- Salesman activity
- Dealer clusters
- Geographic coverage

Avoid loading thousands of markers directly into the browser.

Use:

- Pagination
- Clustering
- Viewport-based queries
- Server-side filtering

---

# 42. Performance Requirements

Performance is a major priority.

The previous project experienced performance/architecture issues, so this project must be designed carefully from the beginning.

## Rules

- Prefer Server Components in Next.js.
- Use Client Components only where interactivity requires them.
- Avoid unnecessary global state.
- Avoid unnecessary Zustand usage.
- Avoid fetching the same data repeatedly.
- Use pagination.
- Use database indexes.
- Avoid N+1 queries.
- Avoid sending huge datasets to the browser.
- Use server-side filtering.
- Use server-side sorting.
- Use caching where appropriate.
- Use loading states and streaming where useful.
- Keep client-side JavaScript minimal.
- Measure performance before optimizing.

---

# 43. Next.js Architecture

Use a modular monolith.

Recommended structure:

```text
app/
  (auth)/
  (dashboard)/
    dashboard/
    dealers/
    salesmen/
    distributors/
    visits/
    followups/
    opportunities/
  api/
    webhooks/
      messageautosender/

components/
  ui/
  dealers/
  salesmen/
  visits/
  dashboard/

lib/
  supabase/
  ai/
  integrations/
    messageautosender/
  business/
  validations/
  utils/

types/

docs/

public/
```

Exact folder structure can evolve with the application.

---

# 44. API Design

Use API routes/server actions where appropriate.

External integrations:

```text
/api/webhooks/messageautosender
```

Internal business logic should be separated from route handlers.

Do not place large business logic blocks directly inside route handlers.

Prefer:

```text
Route
  ↓
Validation
  ↓
Service
  ↓
Business Logic
  ↓
Repository/Database
```

---

# 45. Supabase Rules

Supabase PostgreSQL is the primary database.

Use:

- Proper foreign keys
- Indexes
- Constraints
- RLS
- Database functions only where useful
- Transactions where required
- Proper timestamps
- UUIDs or appropriate identifiers

Do not bypass RLS casually.

Never expose privileged Supabase service-role credentials to the client.

---

# 46. Storage

Use Supabase Storage initially.

Potential buckets:

```text
dealer-attachments
visit-attachments
whatsapp-media
documents
```

Important WhatsApp media should be copied into controlled storage rather than relying permanently on external MessageAutoSender URLs.

---

# 47. AI Safety and Reliability

AI must not be considered authoritative for:

- Financial amounts
- Dealer identity when ambiguous
- Distributor assignment when ambiguous
- Critical business status
- User permissions
- Database permissions

AI output must be validated.

For structured AI output:

```text
AI
 ↓
JSON schema validation
 ↓
Business validation
 ↓
Database
```

---

# 48. Auditability

Important actions should be traceable.

The system should be able to answer:

```text
Where did this dealer information come from?
```

For AI-created/updated data, preserve:

- Source WhatsApp message
- Session
- AI extraction
- Timestamp
- Model
- Confidence
- Final database action

This allows management/developers to debug incorrect AI decisions.

---

# 49. Error Handling

Webhook processing must be resilient.

If AI fails:

```text
Message remains stored
Processing status = failed
```

It should be possible to retry processing.

If media download fails:

```text
Store error
Retry
Do not lose original webhook data
```

If database operation fails:

```text
Do not lose incoming message
```

Raw webhook data must remain available.

---

# 50. Idempotency

Every external WhatsApp message has a unique ID.

Use it to prevent duplicate processing.

Rule:

```text
Same external message ID
        ↓
Already processed?
        ↓
YES → ignore
NO  → process
```

This is mandatory.

---

# 51. Security

Never expose:

- MessageAutoSender API credentials
- OpenAI API key
- Supabase service role key
- Other private secrets

to browser/client code.

Use environment variables.

Validate webhook requests.

Use authentication and authorization for management interfaces.

Do not trust AI-generated permissions or identities.

---

# 52. Environment Variables

Expected environment configuration may include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

OPENAI_API_KEY

MESSAGEAUTOSENDER_BASE_URL
MESSAGEAUTOSENDER_API_KEY
MESSAGEAUTOSENDER_USERNAME
MESSAGEAUTOSENDER_PASSWORD

MESSAGEAUTOSENDER_CHANNEL_ID

NEXT_PUBLIC_APP_URL
```

Only include credentials actually required by the chosen MessageAutoSender authorization mechanism.

Never commit `.env` files.

---

# 53. Development Roadmap

## Phase 0 — Foundation

- [ ] Create Next.js project
- [ ] TypeScript
- [ ] Tailwind
- [ ] shadcn/ui
- [ ] Supabase connection
- [ ] Authentication
- [ ] Basic dashboard layout
- [ ] Roles
- [ ] Initial database schema
- [ ] RLS
- [ ] Development environment

---

# Phase 1 — MessageAutoSender Integration

Goal:

Receive and store WhatsApp messages.

- [ ] Configure MessageAutoSender webhook
- [ ] Create webhook endpoint
- [ ] Receive test message
- [ ] Validate payload
- [ ] Store raw webhook
- [ ] Identify inbound/outbound
- [ ] Identify salesman
- [ ] Implement idempotency
- [ ] Handle text
- [ ] Handle location
- [ ] Handle vCard
- [ ] Handle image
- [ ] Handle audio
- [ ] Handle document
- [ ] Implement outgoing message
- [ ] Send confirmation

Milestone:

```text
WhatsApp
 ↓
MessageAutoSender
 ↓
Next.js
 ↓
Supabase
 ↓
WhatsApp response
```

---

# Phase 2 — AI Processing

- [ ] Message intent classification
- [ ] Session grouping
- [ ] Text extraction
- [ ] Voice transcription
- [ ] Visiting-card extraction
- [ ] vCard parsing
- [ ] Location extraction
- [ ] Dealer extraction
- [ ] Product extraction
- [ ] Interest detection
- [ ] Follow-up extraction
- [ ] Opportunity extraction
- [ ] Confidence scoring
- [ ] Validation
- [ ] AI audit trail

Milestone:

```text
Raw WhatsApp conversation
        ↓
Structured business information
```

---

# Phase 3 — Dealer Management

- [ ] Dealer CRUD
- [ ] Dealer search
- [ ] Dealer filters
- [ ] Dealer profile
- [ ] Dealer contacts
- [ ] Dealer status
- [ ] Distributor relationship
- [ ] Duplicate detection
- [ ] Dealer activity timeline
- [ ] Dealer attachments

---

# Phase 4 — Sales Activity

- [ ] Visit management
- [ ] Location
- [ ] Visit timeline
- [ ] Product discussions
- [ ] Opportunities
- [ ] Follow-ups
- [ ] Follow-up reminders
- [ ] Salesman activity
- [ ] Daily activity

---

# Phase 5 — Management Dashboard

- [ ] Management dashboard
- [ ] Salesman performance
- [ ] Dealer coverage
- [ ] New dealer analytics
- [ ] Visit analytics
- [ ] Follow-up analytics
- [ ] Opportunity pipeline
- [ ] State/city analytics
- [ ] Distributor analytics
- [ ] Maps
- [ ] Reports
- [ ] Export

---

# Phase 6 — AI Intelligence

Future features:

- [ ] AI daily salesman summary
- [ ] AI weekly management summary
- [ ] Dealer health score
- [ ] Dealer opportunity score
- [ ] Missed follow-up detection
- [ ] Salesman activity anomalies
- [ ] Dealer inactivity detection
- [ ] Territory opportunity detection
- [ ] Recommended next actions
- [ ] Natural-language management queries

Example:

> Which salesmen have the highest number of high-interest PPF dealers this month?

The system should eventually be able to answer from structured business data.

---

# 54. Future AI Sales Assistant

The WhatsApp bot may eventually support queries such as:

Salesman:

> Show my pending follow-ups.

System:

```text
Today's Follow-ups

1. Sharma Auto
   Send quotation
   Due today

2. Patel Accessories
   Call owner
   Due today
```

Salesman:

> Dealers near me

System:

```text
Dealers within 20 km

1. Sharma Auto - 4.2 km
2. Patel Accessories - 7.1 km
3. Royal Auto - 11.3 km
```

Salesman:

> What did I discuss with Sharma Auto last time?

System:

```text
Last visit:
17 August

Discussed:
PPF

Interest:
High

Next action:
Send quotation
```

---

# 55. Important Architectural Decisions

## ADR-001 — Next.js

Use Next.js with TypeScript.

Reason:

- Existing expertise
- Full-stack capability
- Server-side rendering
- API routes
- Server Components
- Vercel deployment

---

## ADR-002 — Supabase

Use Supabase PostgreSQL as the primary database.

Reason:

- Existing paid infrastructure
- PostgreSQL
- Authentication
- Storage
- RLS
- Developer familiarity

---

## ADR-003 — Vercel

Use Vercel for initial application hosting.

Do not migrate to AWS/GCP without a concrete requirement.

---

## ADR-004 — MessageAutoSender

Use the existing paid MessageAutoSender service for WhatsApp integration.

Reason:

- Existing subscription
- WhatsApp messaging
- Incoming webhook
- Outgoing API
- Media support
- Contact/location support

---

## ADR-005 — No Separate Salesman App

Do not build a dedicated mobile app for salesmen initially.

Reason:

The primary product goal is to eliminate CRM friction.

WhatsApp is already familiar to the sales team.

---

## ADR-006 — Modular Monolith

Use a modular monolith.

Do not create microservices prematurely.

---

## ADR-007 — AI Is Not the Database Authority

AI extracts information.

Business rules validate information.

The database stores validated information.

---

# 56. Things We Must NOT Do

Do not:

- Build a salesman mobile app initially.
- Force salesmen to fill large forms.
- Make salesmen manually enter every visit.
- Process expensive AI tasks inside the webhook request.
- Treat every WhatsApp message as a new visit.
- Process outbound messages as inbound salesman activity.
- Create duplicate dealers blindly.
- Trust AI blindly.
- Put API credentials in frontend code.
- Load huge datasets into the browser.
- Fetch everything on every page load.
- Overuse client components.
- Put all application state into Zustand.
- Introduce microservices without a requirement.
- Introduce AWS merely because it is available.
- Build Kubernetes infrastructure unnecessarily.
- Create unnecessary database tables.
- Create unnecessary APIs.
- Store important media only on external third-party URLs.
- Ignore failed AI processing.
- Lose raw webhook messages.
- Ignore idempotency.
- Make architectural changes without documenting the reason.

---

# 57. Product Design Principles

The UI should be:

- Clean
- Fast
- Professional
- Data-focused
- Easy to understand
- Responsive
- Desktop-first for management
- Mobile-friendly where appropriate

Avoid:

- Excessive animations
- Heavy dashboards
- Too many cards
- Unnecessary charts
- Information overload
- Complicated navigation

Prioritize:

```text
Information
    ↓
Clarity
    ↓
Action
```

---

# 58. Development Workflow

For every new feature:

```text
Requirement
    ↓
Understand business purpose
    ↓
Update documentation
    ↓
Design database changes
    ↓
Design business logic
    ↓
Design API/service
    ↓
Implement
    ↓
Test
    ↓
Review performance/security
    ↓
Update documentation
```

Do not start implementation based on ambiguous requirements.

If a requirement affects existing business rules, inspect the existing architecture before modifying it.

---

# 59. Claude Code Instructions

Before implementing a feature:

1. Read this CLAUDE.md.
2. Inspect the existing project structure.
3. Inspect related database tables.
4. Inspect related services/components.
5. Reuse existing patterns.
6. Do not introduce a new pattern without a reason.
7. Check whether the requested feature already partially exists.
8. Consider security and authorization.
9. Consider performance.
10. Consider failure/retry behavior.
11. Update documentation when architecture changes.

When implementing:

- Prefer simple solutions.
- Keep code modular.
- Keep business logic separate from UI.
- Validate external input.
- Validate AI output.
- Handle errors explicitly.
- Avoid unnecessary dependencies.
- Avoid unnecessary abstractions.
- Keep components focused.
- Keep database queries efficient.

---

# 60. Definition of Done

A feature is not complete merely because the UI works.

A feature is complete when:

- UI works
- Backend works
- Database is correct
- Authorization is correct
- Validation exists
- Error handling exists
- Loading states exist
- Empty states exist
- Performance is acceptable
- Duplicate actions are handled
- Relevant tests exist
- Documentation is updated

---

# 61. Current MVP Goal

The first complete MVP should prove this single flow:

```text
Salesman meets dealer
        ↓
Salesman sends WhatsApp message
        ↓
Salesman sends visiting card/photo/voice/location
        ↓
MessageAutoSender webhook
        ↓
Next.js
        ↓
Raw messages stored
        ↓
Messages grouped into session
        ↓
AI extracts structured information
        ↓
Business rules validate
        ↓
Dealer created/updated
        ↓
Visit created
        ↓
Follow-up created
        ↓
Salesman receives WhatsApp confirmation
        ↓
Management sees activity in web dashboard
```

This flow is the core proof of the product.

---

# 62. Current Priority

Do not build the entire CRM before proving the WhatsApp-to-database pipeline.

Priority:

```text
1. MessageAutoSender webhook
2. Raw message storage
3. Salesman identification
4. Outbound reply
5. Media handling
6. Session grouping
7. AI extraction
8. Dealer matching
9. Visit creation
10. Follow-up creation
11. Basic dashboard
12. Full CRM
13. Analytics
14. Advanced AI
```

---

# 63. Long-Term Product Vision

The final product should become an AI-powered field-sales operating system.

The salesman should only need to:

```text
MEET
 ↓
TALK
 ↓
SEND
```

The platform should handle:

```text
UNDERSTAND
 ↓
STRUCTURE
 ↓
VALIDATE
 ↓
RECORD
 ↓
REMIND
 ↓
ANALYZE
 ↓
RECOMMEND
```

Management should receive a clear picture of the entire field-sales operation without manually collecting daily reports.

---

# 64. Golden Rule

> Build the system around the salesman, not around the database.

The database should be complex enough to represent the business correctly.

The salesman experience should remain extremely simple.

The management application should expose the complexity only when it provides useful information or enables an action.
