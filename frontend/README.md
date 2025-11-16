# Cybercept MSP Security Platform

##  Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/cybercept-msp-dashboard)

## Overview

Cybercept is a professional MSP (Managed Service Provider) security dashboard that provides comprehensive monitoring and compliance management for AI applications across client portfolios.

###  Features

- **MSP Portfolio Dashboard** - Real-time overview of all managed clients
- **Single Client View** - Detailed security metrics for individual clients  
- **AI Application Monitoring** - Track AI tools, agents, and user interactions
- **Compliance Management** - Progress tracking for NIST, EU AI Act, ISO 42001, and more
- **Risk Assessment** - Automated risk scoring and status badges
- **Inventory Management** - Complete catalog of permitted and unsanctioned AI tools

###  Design System

**Brand Colors:**
- Primary Blue: `#1F7AE0` 
- Secondary Teal: `#0BBBD4`
- Navy Background: `#0B1E3A`
- Gradient: Blue → Teal

**Typography:** Inter font family
**Components:** Built with shadcn/ui and Tailwind CSS

##  Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Icons:** Lucide React
- **Charts:** Recharts
- **Routing:** React Router v6
- **Data:** Local TypeScript files (no backend required)

##  Project Structure

```
src/
 components/
    ui/              # shadcn/ui components
    AppLayout.tsx    # Main layout wrapper
    AppSidebar.tsx   # Navigation sidebar
    Combobox.tsx     # Custom dropdown component
 data/
    clients.ts       # Client portfolio data
    frameworks.ts    # Compliance frameworks
    inventory.ts     # AI applications/agents
    engagement.ts    # Usage analytics
    utils.ts         # Helper functions
 pages/
    Login.tsx        # MSP sign-in page
    Dashboard.tsx    # Portfolio overview
    Client.tsx       # Single client view
    NotFound.tsx     # 404 page
 hooks/               # React hooks
```

##  Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/cybercept-msp-dashboard.git
   cd cybercept-msp-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:8080`

### Build for Production

```bash
npm run build
```

##  Authentication Flow

1. Visit `/login` 
2. Click "MSP Sign In" button
3. Redirected to `/dashboard` (MSP Portfolio)
4. Navigate to `/client` for detailed client views

##  Data Structure

The application uses local TypeScript data files to simulate a live backend:

- **Clients:** 3 sample SMB clients across different industries
- **Frameworks:** NIST, EU AI Act, ISO 42001, Colorado SB21-169, NYC Law 144
- **Inventory:** Mix of permitted/unsanctioned AI applications and agents
- **Engagement:** Top applications, agents, and users with trend analytics

##  Key Features

### MSP Dashboard (`/dashboard`)
- Portfolio-wide KPI tiles with sparkline trends
- Client table with risk assessments
- Click-through navigation to client details

### Single Client View (`/client`)
- Client selector/switcher
- Individual KPI metrics
- Compliance framework progress with modal details
- AI inventory with search and filtering
- Top 5 engagement rankings (apps, agents, users)

### Design Highlights
- Enterprise-grade professional styling
- Cybercept brand gradient accents
- Responsive layout with sidebar navigation
- Loading states and hover effects
- Risk badges and status indicators

##  Future Enhancements (TODO)

- [ ] **Policy Center** - AI governance and policy management
- [ ] **Reports** - Compliance reports and security analytics  
- [ ] **Real-time API Integration** - Connect to live security data sources
- [ ] **User Management** - Multi-tenant MSP user roles
- [ ] **Alerting System** - Risk threshold notifications
- [ ] **Advanced Charts** - Detailed trend analysis and forecasting

##  Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Deploy automatically on every push to main branch
3. Custom domain support available

### Other Platforms
- **Netlify:** `npm run build` → Deploy `dist` folder
- **AWS S3 + CloudFront:** Static site hosting
- **Firebase Hosting:** `firebase deploy`

##  License

This project is licensed under the MIT License.

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with  for MSP Security Management**

*Cybercept - Innovate Securely*