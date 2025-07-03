# Sensor Transmitter - ESP32 Data Logger

## Overview

This is a full-stack web application designed to collect GPS and accelerometer data from mobile devices and transmit it to ESP32 microcontrollers. The application features a React frontend with a Node.js/Express backend, utilizing PostgreSQL for data storage. It's built as a Progressive Web App (PWA) optimized for mobile devices.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks and TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions
- **Development**: Hot module replacement via Vite integration

### Database Design
- **Primary Database**: PostgreSQL via Neon Database serverless
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**:
  - `users`: User authentication and management
  - `sensor_data`: GPS and accelerometer readings
  - `transmission_logs`: ESP32 communication logs and statistics

## Key Components

### Sensor Data Collection
- **GPS Integration**: Native browser geolocation API with high accuracy settings
- **Accelerometer**: DeviceMotionEvent API for motion sensor data
- **Permission Management**: Comprehensive permission handling for sensor access
- **Real-time Updates**: Continuous sensor monitoring with configurable intervals

### ESP32 Communication
- **Direct HTTP Communication**: Primary method for sending data to ESP32 devices
- **Fallback Proxy**: Server-side proxy for connectivity issues
- **Connection Management**: Automatic retry logic and connection status monitoring
- **Data Serialization**: JSON-based data format for sensor readings

### Data Persistence
- **Local Storage**: Sensor data caching and transmission queue management
- **Database Logging**: All sensor readings and transmission attempts stored
- **Statistics Tracking**: Success rates, transmission counts, and error logging

### User Interface
- **Mobile-First Design**: Optimized for touch interfaces and mobile viewports
- **Real-time Status**: Live connection status and sensor data display
- **Responsive Layout**: Adaptive design for various screen sizes
- **PWA Features**: Web app manifest and service worker ready

## Data Flow

1. **Sensor Acquisition**: Browser APIs collect GPS coordinates and accelerometer data
2. **Data Validation**: Client-side validation using Zod schemas
3. **Local Caching**: Sensor data stored locally for offline capability
4. **ESP32 Transmission**: Direct HTTP POST to configured ESP32 IP address
5. **Fallback Handling**: Server proxy used if direct connection fails
6. **Database Logging**: All operations logged to PostgreSQL for analytics
7. **Statistics Update**: Real-time transmission statistics calculated and displayed

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query
- **UI Components**: Radix UI primitives, Lucide React icons
- **Development Tools**: Vite, TypeScript, ESBuild

### Database and ORM
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Built-in connection management

### Styling and UI
- **Tailwind CSS**: Utility-first CSS framework
- **Class Variance Authority**: Component variant management
- **PostCSS**: CSS processing and optimization

### Sensor and Network APIs
- **Native Browser APIs**: Geolocation, DeviceMotion
- **Fetch API**: HTTP communications with ESP32 devices
- **WebSocket Ready**: Infrastructure for real-time updates

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Neon Database development instance
- **Environment Variables**: `.env` file for local configuration

### Production Build
- **Frontend**: Vite production build with optimization
- **Backend**: ESBuild bundling for Node.js deployment
- **Static Assets**: Optimized and minified for CDN delivery

### Hosting Considerations
- **Frontend**: Static hosting (Vercel, Netlify, or similar)
- **Backend**: Node.js hosting (Railway, Render, or similar)
- **Database**: Neon Database production instance
- **SSL/TLS**: HTTPS required for sensor API access

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **NODE_ENV**: Environment specification
- **CORS Settings**: Configured for cross-origin requests

## Changelog

```
Changelog:
- July 03, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```