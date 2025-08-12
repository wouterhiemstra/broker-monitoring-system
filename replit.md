# Overview

This is a full-stack broker tracking application designed to monitor and manage business listings from various broker websites. The system automatically scrapes broker sites for IT services companies, tracks KPIs, and provides a dashboard for managing deal flow. It's built with a React frontend, Express backend, and PostgreSQL database using modern TypeScript tooling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for build tooling
- **UI Library**: Shadcn/UI components built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

The frontend follows a component-based architecture with shared UI components, page components, and business logic hooks. The application uses a sidebar navigation layout with dedicated pages for Dashboard, Listings, Brokers, and Scraping management.

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API endpoints with JSON responses
- **File Handling**: Multer for multipart form uploads
- **Scheduling**: Node-cron for automated scraping tasks

The backend implements a service-oriented architecture with separate services for web scraping, scheduling, and data storage. It includes middleware for request logging and error handling.

## Data Storage
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: WebSocket-enabled connection using @neondatabase/serverless

The database schema includes tables for users, brokers, listings, scraping logs, and pain points with proper foreign key relationships and indexing.

## Web Scraping System
- **Engine**: Puppeteer for browser automation and web scraping
- **Scheduling**: Automated morning (9 AM) and afternoon (2 PM) scraping on weekdays
- **Configuration**: JSON-based broker configurations with selectors and filters
- **Error Handling**: Comprehensive error tracking with pain point logging

The scraping system supports multiple broker websites with configurable selectors and filtering options. It includes retry logic and performance monitoring.

## Authentication & Security
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **Environment Variables**: Secure configuration management for database URLs and API keys
- **Input Validation**: Zod schemas for runtime type checking and validation

## Development Environment
- **Build System**: Vite for frontend bundling with ESBuild for backend compilation
- **Type Checking**: Strict TypeScript configuration with path mapping
- **Hot Reload**: Development server with automatic reloading
- **Linting**: Integrated code quality tools

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Connection Pooling**: Built-in connection management for scalability

## UI Components & Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Date-fns**: Date manipulation and formatting utilities

## Development Tools
- **Replit Integration**: Development environment with cartographer plugin
- **Runtime Error Overlay**: Enhanced debugging experience
- **PostCSS**: CSS processing with Autoprefixer

## Web Scraping Infrastructure
- **Puppeteer**: Headless Chrome browser automation
- **WebSocket Support**: Real-time communication capabilities
- **Cron Scheduling**: Time-based job execution

## Form & Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation
- **Hookform Resolvers**: Integration between form library and validation schemas

The application is designed as a monorepo with shared TypeScript types between frontend and backend, ensuring type safety across the entire stack. The architecture supports both manual and automated data collection workflows with comprehensive monitoring and error tracking capabilities.