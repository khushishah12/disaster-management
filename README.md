# 🚨 Disaster Management Platform

A comprehensive real-time disaster management and emergency response platform built with modern web technologies. This application enables efficient coordination between relief workers, emergency services, and authorities during disaster situations.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [API Routes](#-api-routes)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Functionality
- **Real-time Disaster Tracking**: Monitor global disaster events using GDACS and Eonet data feeds
- **Interactive Maps**: Visualize disaster zones, relief resources, and emergency services on interactive India maps
- **Relief Worker Management**: Register, authenticate, and manage relief workers across regions
- **Emergency SOS System**: Quick emergency reporting and dispatch system
- **Live Dispatch System**: Real-time socket-based communication for emergency coordination
- **Analytics Dashboard**: View disaster statistics, response times, and resource allocation metrics

### Emergency Services Integration
- 🚑 **Ambulance Dispatch**: Coordinate ambulance services
- 🚒 **Fire Services**: Fire emergency response and management
- 🏥 **Hospital Coordination**: Hospital availability and resource tracking
- 👨‍🚒 **Rescue Operations**: Coordinate rescue teams
- 🏠 **Shelter Management**: Manage temporary shelters for affected populations

### Advanced Features
- Real-time bidirectional communication via Socket.io
- Secure authentication with Supabase
- Responsive design with TailwindCSS
- Type-safe development with TypeScript
- Form validation with React Hook Form and Zod

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16.2.6](https://nextjs.org/) - React framework with App Router
- **UI Library**: [React 19.2.4](https://react.dev/)
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/)
- **Maps**: [Leaflet](https://leafletjs.com/) + [React-Leaflet](https://react-leaflet.js.org/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack React Query](https://tanstack.com/query/)

### Backend
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Real-time**: [Socket.io](https://socket.io/)
- **Language**: TypeScript + Node.js

### Development Tools
- **Linting**: ESLint
- **Testing**: Node test runner
- **Package Manager**: npm

## 📦 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database and authentication)
- Environment variables configured (see Configuration section)

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/shshwtsuthar/disaster-management.git
cd disaster-management
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables** (see Configuration section below)

## ⚙️ Configuration

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration (if needed)
SOCKET_SERVER_URL=http://localhost:3001


## 🎯 Getting Started

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Socket Server

For real-time dispatch functionality, run the dispatch server in a separate terminal:

```bash
npm run socket
```

This starts the WebSocket server on port 3001 (configurable).

### Fetch Disaster Data

To fetch and sync GDACS disaster data for India:

```bash
npm run fetch:gdacs:india
```

## 📁 Project Structure

```
disaster-management/
├── app/
│   ├── api/              # API route handlers
│   ├── auth/             # Authentication pages (login, register)
│   ├── dashboard/        # Main dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── sos/              # SOS emergency page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── IndiaMap.tsx      # Main map component
│   ├── IndiaMapSection.tsx
│   ├── MapLegend.tsx
│   ├── GdacsEventsLayer.tsx   # GDACS disaster events
│   ├── GdacsPolygonsLayer.tsx # GDACS disaster zones
│   ├── HistoricalGdacsEventsLayer.tsx
│   ├── EonetEventsLayer.tsx   # Eonet events layer
│   ├── ReliefWorkerLogin.tsx
│   ├── ReliefWorkerRegistration.tsx
│   ├── TopBar.tsx
│   ├── ErrorBoundary.tsx
│   ├── QueryProvider.tsx
│   ├── ai-response/      # AI response components
│   ├── ambulance/        # Ambulance service components
│   ├── analytics/        # Dashboard analytics
│   ├── dashboard/        # Dashboard components
│   ├── emergency/        # Emergency service components
│   ├── fire/             # Fire service components
│   ├── hospital/         # Hospital components
│   ├── rescue/           # Rescue service components
│   ├── shelter/          # Shelter components
│   ├── sos/              # SOS components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility functions and libraries
│   └── *.test.ts         # Unit tests
├── server/
│   └── dispatch-server.mjs  # Socket.io dispatch server
├── scripts/              # Utility scripts
│   ├── fetch-gdacs-india.ts # GDACS data fetching script
│   └── register-ts-paths.mjs # TypeScript path resolution
├── supabase/             # Supabase configuration
├── public/               # Static assets
├── middleware.ts         # Next.js middleware
├── tsconfig.json         # TypeScript configuration
├── next.config.ts        # Next.js configuration
├── postcss.config.mjs    # PostCSS configuration
└── package.json          # Project dependencies
```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on http://localhost:3000 |
| `npm run socket` | Start WebSocket dispatch server |
| `npm run build` | Build the application for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm test` | Run unit tests |
| `npm run fetch:gdacs:india` | Fetch GDACS disaster data for India |

## 🔌 API Routes

The application includes several API endpoints under `app/api/`:

- **Authentication**: User login, registration, and token management
- **Disaster Data**: Fetch and update disaster events
- **Emergency Services**: Manage ambulance, fire, hospital, rescue, and shelter resources
- **Analytics**: Generate and retrieve disaster statistics

Refer to the `app/api/` directory for detailed route implementations.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Tests are located in `lib/**/*.test.ts` files and use Node's native test runner.

## 🌐 Disaster Data Sources

- **GDACS** (Global Disaster Alert and Coordination System): Real-time disaster alerts
- **Eonet** (NASA Earth Observatory Natural Event Tracking): Natural disaster tracking

## 🔐 Security

- Supabase Row-Level Security (RLS) policies for database
- Secure authentication with Supabase Auth
- Protected API routes with middleware
- Environment variables for sensitive data
- Type-safe validation with Zod

## 🚀 Deployment

### Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Vercel automatically deploys on every push

[Vercel Deployment Documentation](https://vercel.com/docs/frameworks/nextjs)

### Deploy on Other Platforms

- Configure environment variables
- Run `npm run build` to create production build
- Run `npm start` to start production server
- Ensure Socket.io server is running on appropriate port

## 📞 Support & Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Socket.io Documentation](https://socket.io/docs/)
- [React Hook Form Documentation](https://react-hook-form.com/form-builder)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows the existing style
- Tests pass (`npm test`)
- Linter is happy (`npm run lint`)
- Documentation is updated

## 📄 License

This project is open source and available under the MIT License.

## 👥 Authors

- Created by Khushi Shah

---

**Note**: This is an active development project. For issues, questions, or suggestions, please open an issue on GitHub.
