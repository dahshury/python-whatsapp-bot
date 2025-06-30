# Enhanced Dashboard System

This directory contains a comprehensive analytics dashboard that replaces the original Streamlit implementation with a modern Next.js/React interface.

## Components

### Core Components

- **`enhanced-dashboard-view.tsx`** - Main dashboard container with tabs, filters, and data management
- **`kpi-cards.tsx`** - Key Performance Indicator cards showing metrics and system status
- **`trend-charts.tsx`** - Various chart components using Recharts for data visualization
- **`message-analysis.tsx`** - Message analytics including heatmaps and conversation insights

### Services

- **`dashboard-service.ts`** - Data fetching and processing service that communicates with backend APIs

### Types

- **`dashboard.ts`** - TypeScript interfaces for all dashboard data structures

## Features

### Data Visualizations

1. **KPI Cards**
   - Total reservations, cancellations, customers
   - Conversion rates and customer retention metrics
   - System performance metrics (CPU, memory, success rates)
   - Animated progress bars and trend indicators

2. **Trend Charts**
   - Daily reservations and cancellations (area charts)
   - Monthly growth trends (line charts)
   - Day-of-week analysis (bar charts)
   - Time slot popularity (horizontal bar charts)
   - Customer segmentation (pie charts)
   - Conversion funnel visualization

3. **Message Analytics**
   - Interactive heatmap showing message volume by hour/day
   - Top customer activity rankings
   - Word frequency analysis
   - Conversation metrics (length, response time)

### Interactive Features

- **Date Range Filtering** - 7, 30, or 90-day views
- **Real-time Data Refresh** - Manual refresh with loading states
- **Data Export** - JSON export functionality
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Smooth Animations** - Framer Motion animations for better UX
- **Error Handling** - Graceful error states with retry options

## Data Sources

The dashboard fetches data from:

1. **Reservations API** (`/api/reservations`) - All reservation data including cancelled ones
2. **Conversations API** (`/api/conversations`) - WhatsApp message data
3. **Prometheus Metrics** - System performance metrics

## Architecture

```
Dashboard View
├── Data Service (fetches from APIs)
├── KPI Cards (metrics overview)
├── Trend Charts (visualizations)
└── Message Analysis (conversation insights)
```

## Usage

The dashboard is automatically loaded when navigating to `/dashboard`. It provides:

- **Overview Tab** - Key metrics and recent trends
- **Trends Tab** - Detailed historical analysis
- **Messages Tab** - Communication patterns and insights
- **Insights Tab** - AI-generated business recommendations

## Performance

- Uses React.memo and useMemo for optimization
- Lazy loading of chart components
- Efficient data processing with Map/Set operations
- Responsive design prevents unnecessary re-renders

## Environment Configuration

You can control the dashboard behavior with these environment variables:

```bash
# Use mock data instead of real API calls (useful for development)
NEXT_PUBLIC_USE_MOCK_DATA=true

# Force real data even in development mode
NEXT_PUBLIC_FORCE_REAL_DATA=true

# Prometheus URL for system metrics (optional)
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090

# Python backend URL (defaults to http://localhost:8000)
PYTHON_BACKEND_URL=http://localhost:8000
```

## Development Mode

In development (`NODE_ENV=development`), the dashboard automatically uses mock data unless:
- `NEXT_PUBLIC_FORCE_REAL_DATA=true` is set
- Real APIs are available and responding

## Mock Data

When real APIs are unavailable, the dashboard gracefully falls back to realistic mock data that demonstrates all features. A "Demo Data" badge appears when mock data is active.

## Prometheus Metrics on Windows

If you're running on Windows and seeing "demo data" for system metrics (CPU, Memory, Success Rate), this is expected because:

1. **Prometheus typically runs in Docker/Linux environments**
2. **System metrics may not be available on Windows development machines**
3. **The dashboard gracefully falls back to demo values when Prometheus is unavailable**

### To enable real Prometheus metrics:

1. **Run Prometheus in Docker**:
   ```bash
   docker run -p 9090:9090 prom/prometheus
   ```

2. **Set the Prometheus URL**:
   ```bash
   NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
   ```

3. **Ensure your Python backend is exposing metrics** at `/metrics` endpoint

4. **Configure Prometheus to scrape your backend**:
   ```yaml
   scrape_configs:
     - job_name: 'whatsapp-bot'
       static_configs:
         - targets: ['host.docker.internal:8000']  # Windows Docker
   ```

The dashboard will automatically detect when Prometheus is available and switch from demo data to real metrics.

## Future Enhancements

- Real-time WebSocket updates
- Advanced filtering (customer type, reservation type)
- Custom date range picker
- PDF report generation
- Predictive analytics
- A/B testing metrics 