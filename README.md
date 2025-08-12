# Broker Monitoring System

An automated broker monitoring system that scrapes MSP/IT services listings from 11 broker websites and manages the entire lead qualification workflow.

## Features

- **Dashboard**: Real-time KPI tracking and system overview
- **Automated Scraping**: Scheduled scraping of broker websites for new listings
- **Listing Management**: Complete CRUD operations for broker listings
- **Broker Configuration**: Manage broker settings and scraping configurations
- **Lead Qualification**: Track listing status through the entire workflow
- **Data Export**: Export listings to Excel/CSV format
- **Real-time Monitoring**: Live scraping status and progress tracking

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Shadcn/UI + Tailwind CSS
- **Scraping**: Puppeteer for browser automation
- **Scheduling**: Node-cron for automated tasks

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/broker-monitoring-system.git
   cd broker-monitoring-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database URL:
   ```
   DATABASE_URL="postgresql://username:password@hostname:port/database"
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Seed initial broker data**
   ```bash
   npm run db:seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                # Express backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── db.ts              # Database connection
├── shared/                # Shared TypeScript types
│   └── schema.ts          # Database schema and validation
└── uploads/               # File upload directory
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio
- `npm test` - Run tests

## Deployment

### Replit Deployment

1. **Deploy directly from GitHub**
   - Connect your GitHub repository to Replit
   - Set environment variables in Replit Secrets
   - Add PostgreSQL database using Replit's database service

2. **Manual deployment**
   - Import project to Replit
   - Configure environment variables
   - Install dependencies and run

### Other Platforms

The application can be deployed to any platform that supports Node.js:

- **Vercel/Netlify**: For frontend + serverless functions
- **Railway/Render**: For full-stack deployment
- **Heroku**: Traditional hosting platform
- **DigitalOcean App Platform**: Container-based deployment

## Configuration

### Broker Configurations

Broker scraping configurations are defined in `client/src/lib/brokers.ts`. Each broker has:

- Base URL for scraping
- CSS selectors for data extraction
- Filter configurations
- Tier classification (1-5, where 1 is highest value)

### Scheduling

Automated scraping runs:
- **Morning scan**: 9:00 AM weekdays (all brokers)
- **Afternoon scan**: 2:00 PM weekdays (priority brokers only)

Modify schedules in `server/services/scheduler.ts`.

## Database Schema

The system uses the following main tables:

- **users**: User authentication
- **brokers**: Broker configurations and metadata
- **listings**: Individual business listings
- **scraping_logs**: Scraping execution history
- **pain_points**: Error and issue tracking

## API Documentation

### Core Endpoints

- `GET /api/kpis` - Dashboard KPI data
- `GET /api/listings` - Retrieve listings with filtering
- `POST /api/listings` - Create new listing
- `PATCH /api/listings/:id` - Update listing status
- `GET /api/brokers` - Retrieve broker configurations
- `POST /api/scraping/start` - Trigger manual scraping
- `GET /api/scraping/status` - Get current scraping status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the SOP document for business process details