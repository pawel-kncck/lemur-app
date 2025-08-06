# Lemur - AI-Powered Data Analysis Chatbot

Lemur is a modern web application that allows users to upload CSV files, provide business context, and chat with an AI assistant to analyze their data. Built with React, TypeScript, and FastAPI.

## Features

- 📊 **Data Upload**: Upload CSV files and preview your data
- 📝 **Business Context**: Add context about your data to improve AI understanding
- 💬 **AI Chat**: Ask questions and get insights about your data
- 🗂️ **Project Management**: Organize your analyses in separate projects
- 🚀 **Fast & Responsive**: Modern UI with real-time updates

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + Python
- **AI**: OpenAI GPT-4 with LangChain
- **Data Processing**: Pandas
- **Database**: PostgreSQL (SQLite for development)
- **File Storage**: S3/MinIO
- **Caching**: Redis
- **Styling**: CSS-in-JS with dark theme

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- OpenAI API key (optional, but required for AI chat features)

### 🚀 One-Command Start (Recommended)

The easiest way to start Lemur is with a single command that:
- Checks all prerequisites
- Installs dependencies automatically
- Starts both backend and frontend servers
- Opens your browser automatically

```bash
# Clone and start
git clone <your-repo-url>
cd lemur-app

# Start with one command (choose based on your system)
npm start              # Recommended: Enhanced start with auto-browser open
# OR
./start.sh            # Alternative: Bash script for Mac/Linux
# OR
start.bat             # Alternative: Batch file for Windows
```

### Manual Setup (Alternative)

If you prefer to set up manually or the auto-start doesn't work:

1. **Set up the backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   pip install -r requirements.txt
   python main.py
   ```

2. **Set up the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Docker Development

1. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up
   ```
   
   This will start:
   - Backend API (port 8000)
   - Frontend (port 5173)
   - PostgreSQL database (port 5432)
   - MinIO S3-compatible storage (port 9000, console on 9001)
   - Redis cache (port 6379)

3. **Access services**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - MinIO Console: http://localhost:9001 (login: minioadmin/minioadmin)

## Usage Guide

1. **Create a Project**
   - Click "New Project" in the sidebar
   - Give your project a descriptive name

2. **Upload Data**
   - Go to the "Data Studio" tab
   - Drag and drop a CSV file or click to browse
   - Preview your data to ensure it uploaded correctly

3. **Add Context**
   - Switch to the "Context" tab
   - Describe your data, business rules, and important metrics
   - Save the context

4. **Chat with AI**
   - Go to the "Chat" tab
   - Ask questions about your data
   - Get insights, analysis recommendations, and answers

## Sample Datasets

The `sample_datasets` folder contains example CSV files you can use to test the application:

- `sales_data.csv` - E-commerce sales transactions
- `customer_data.csv` - Customer information and segments
- `inventory_data.csv` - Product inventory levels

## API Endpoints

- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects
- `POST /api/projects/{id}/upload` - Upload CSV file
- `PUT /api/projects/{id}/context` - Save business context
- `POST /api/projects/{id}/chat` - Send chat message

## Development

### Project Structure
```
lemur-app/
├── backend/
│   ├── main.py          # FastAPI application
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── lib/         # API integration
│   │   └── types/       # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── sample_datasets/     # Example CSV files
└── docker-compose.yml
```

### Common Commands

**Quick Start Commands:**
```bash
npm start            # Start both servers with auto-browser open
npm run start:simple # Start both servers (simple version)
npm run start:bash   # Start using bash script
npm run dev          # Start with colored output (no browser open)
npm run docker       # Start using Docker Compose
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt    # Install dependencies
python main.py                     # Run development server
uvicorn main:app --reload         # Run with auto-reload
npm run backend                    # Run from root directory
```

**Frontend:**
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run frontend     # Run from root directory
```

**Testing:**
```bash
npm test             # Run all tests
npm run test:backend # Run backend tests only
npm run test:frontend # Run frontend tests only
```

## Current Limitations

- **No Authentication**: Currently no user authentication
- **In-Memory Storage**: Data is lost when server restarts
- **Single File**: Only one CSV file per project
- **No Data Persistence**: Chat history and context reset on restart

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please open an issue on GitHub.