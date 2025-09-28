# Mock Data Seeding Scripts

This directory contains scripts for seeding the AI Compliance Platform with comprehensive mock data for development and testing.

## 🚀 Quick Start

### Run Complete Seeding
```bash
cd backend
python scripts/run_seed.py
```

### Run Individual Seeding
```bash
cd backend
python scripts/seed_mock_data.py
```

## 📊 What Gets Seeded

### **Core Data**
- **1 MSP** - Cybercept MSP (Enterprise tier)
- **3 Users** - Admin, User, and Analyst roles
- **4 Clients** - TechCorp, FinanceFirst Bank, HealthCare Plus, RetailMax
- **6 AI Services** - ChatGPT, Claude, Microsoft Copilot, Jasper, Notion AI, Perplexity

### **Client Applications**
- **5 AI Applications** - Realistic applications for each client
- **Department Restrictions** - Proper access controls
- **Integration Data** - Connected systems and tools
- **Approval Status** - Compliance tracking

### **Usage Data**
- **30 Days of Usage** - Realistic interaction patterns
- **Department Filtering** - Engineering, Sales, Marketing, Support, Finance
- **Daily/Total Interactions** - Progressive usage tracking

### **Engagement Data**
- **Agent Engagement** - Internal AI agents and their metrics
- **User Engagement** - User activity patterns
- **Productivity Correlations** - AI usage vs. productivity metrics

### **Compliance Data**
- **3 Frameworks** - HIPAA, GDPR, PCI DSS
- **4 Detection Patterns** - SSN, Medical Records, Email, Credit Cards
- **Alert Data** - Realistic security and compliance alerts

## 🏢 Seeded Clients

### **TechCorp Solutions** (Technology)
- **Industry**: Technology
- **Employees**: 250
- **Compliance**: SOC2, ISO27001
- **AI Apps**: ChatGPT Enterprise, Claude for Work
- **Focus**: Engineering and Product teams

### **FinanceFirst Bank** (Financial Services)
- **Industry**: Financial Services
- **Employees**: 500
- **Compliance**: PCI-DSS, SOX, GDPR
- **AI Apps**: Microsoft Copilot
- **Focus**: Operations and Customer Service

### **HealthCare Plus** (Healthcare)
- **Industry**: Healthcare
- **Employees**: 150
- **Compliance**: HIPAA, HITECH
- **AI Apps**: Notion AI
- **Focus**: Administration and Research

### **RetailMax Stores** (Retail)
- **Industry**: Retail
- **Employees**: 1000
- **Compliance**: PCI-DSS, CCPA
- **AI Apps**: Jasper AI
- **Focus**: Marketing and Content

## 🤖 AI Services

### **ChatGPT** (OpenAI)
- **Category**: Text Generation
- **Risk Level**: Medium
- **Domains**: openai.com, chat.openai.com
- **Features**: Code review, content generation

### **Claude** (Anthropic)
- **Category**: Text Generation
- **Risk Level**: Medium
- **Domains**: claude.ai, anthropic.com
- **Features**: Analysis, writing assistance

### **Microsoft Copilot** (Microsoft)
- **Category**: Productivity
- **Risk Level**: Low
- **Domains**: copilot.microsoft.com, office.com
- **Features**: Office integration, Teams integration

### **Jasper** (Jasper)
- **Category**: Content Creation
- **Risk Level**: Low
- **Domains**: jasper.ai
- **Features**: Marketing content, templates

### **Notion AI** (Notion)
- **Category**: Productivity
- **Risk Level**: Low
- **Domains**: notion.so, notion.site
- **Features**: Writing, summarization, translation

### **Perplexity** (Perplexity)
- **Category**: Research
- **Risk Level**: Medium
- **Domains**: perplexity.ai
- **Features**: Research, citations, real-time data

## 🛡️ Compliance Frameworks

### **HIPAA** (Healthcare)
- **Version**: 2023
- **Requirements**: Administrative, Physical, Technical Safeguards
- **Industries**: Healthcare, Insurance, Pharmaceuticals
- **Key Rules**: Privacy Rule, Security Rule, Breach Notification

### **GDPR** (EU Data Protection)
- **Version**: 2018
- **Requirements**: Data Protection by Design, Impact Assessments
- **Industries**: All industries processing EU data
- **Key Rights**: Access, Rectification, Erasure, Portability

### **PCI DSS** (Payment Card Industry)
- **Version**: 4.0
- **Requirements**: Network Security, Data Protection, Access Control
- **Industries**: Retail, E-commerce, Financial Services
- **Key Standards**: Secure networks, protect cardholder data

## 🔍 Detection Patterns

### **SSN Detection** (HIPAA)
- **Pattern**: `\b\d{3}-?\d{2}-?\d{4}\b`
- **Severity**: Critical
- **Context**: SSN, Social Security, Tax ID

### **Medical Record Number** (HIPAA)
- **Pattern**: `\bMRN[:\s]*\d{6,12}\b`
- **Severity**: High
- **Context**: Medical Record, Patient, MRN

### **Email Address** (GDPR)
- **Pattern**: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`
- **Severity**: Medium
- **Context**: Email, Contact, Personal

### **Credit Card Number** (PCI DSS)
- **Pattern**: `\b(?:\d{4}[-\s]?){3}\d{4}\b`
- **Severity**: Critical
- **Context**: Credit Card, Payment, Card Number

## 📈 Usage Patterns

### **Realistic Data Generation**
- **Base Interactions**: 50-250 per service per day
- **Department Variation**: Different usage by department
- **Time Progression**: 30 days of historical data
- **Growth Patterns**: Realistic usage trends

### **Department Distribution**
- **Engineering**: High usage, technical focus
- **Sales**: Medium usage, customer-facing
- **Marketing**: Medium usage, content creation
- **Support**: High usage, customer service
- **Finance**: Low usage, restricted access

## 🚨 Alert Data

### **Usage Anomaly**
- **Title**: "Unusual AI Usage Pattern Detected"
- **Severity**: Medium
- **Description**: 150% increase in ChatGPT usage

### **Data Leakage Risk**
- **Title**: "Potential Data Leakage Risk"
- **Severity**: High
- **Description**: Sensitive financial data in AI prompt

### **Compliance Violation**
- **Title**: "HIPAA Compliance Violation"
- **Severity**: Critical
- **Description**: Patient data found in AI conversation



## 🔧 Customization

### **Modify Client Data**
Edit the `clients_data` list in `seed_mock_data.py` to add more clients or modify existing ones.

### **Add AI Services**
Edit the `ai_services_data` list to add new AI services or modify existing ones.

### **Adjust Usage Patterns**
Modify the `seed_client_usage_data` function to change usage patterns and volumes.

### **Add Compliance Frameworks**
Edit the `frameworks_data` list to add new compliance frameworks.

## 📝 Notes

- **Idempotent**: Scripts can be run multiple times safely
- **Realistic Data**: All data is designed to be realistic and useful for testing
- **Relationships**: Proper foreign key relationships are maintained
- **Timestamps**: Realistic timestamps and date ranges
- **Validation**: All data passes model validation

## 🎯 Use Cases

This seeded data is perfect for:
- **API Testing**: Test all endpoints with realistic data
- **Frontend Development**: Build UI components with real data
- **Integration Testing**: Test data flows and relationships
- **Performance Testing**: Test with realistic data volumes
- **Demo Purposes**: Show realistic system behavior

The seeded data provides a complete, realistic environment for development and testing! 🎉