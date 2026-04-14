# IntelliChat - AI-Powered Knowledge Base Platform

> A production-ready, multi-tenant Retrieval-Augmented Generation (RAG) platform that transforms enterprise documents into an intelligent, conversational knowledge base powered by Claude AI.

---

## Why IntelliChat?

Traditional knowledge bases force users to search, scroll, and read through pages of documents. **IntelliChat** lets your team simply _ask questions_ and get accurate, source-cited answers in real time — backed by a sophisticated RAG pipeline that ensures zero hallucination.

---

## Key Highlights

| Metric | Value |
|--------|-------|
| **API Endpoints** | 25 RESTful routes |
| **Supported File Formats** | 18+ (PDF, DOCX, XLSX, PPTX, CSV, Images, etc.) |
| **Chunking Strategies** | 6 intelligent strategies |
| **Docker Services** | 6 containerized microservices |
| **MongoDB Collections** | 7 data models |
| **Backend Services** | 9 service layers |
| **React Components** | 24 UI components |
| **Validation Schemas** | 12 Joi schemas |

---

## Architecture Overview

```
                         +-------------------+
                         |   React 19 SPA    |
                         |  (Vite + Nginx)   |
                         +--------+----------+
                                  |
                                  | REST API + SSE Streaming
                                  v
                         +--------+----------+
                         |  Express.js API   |
                         |  (25 endpoints)   |
                         +--+-----+------+---+
                            |     |      |
              +-------------+     |      +--------------+
              v                   v                     v
    +---------+------+  +---------+-------+  +----------+--------+
    |   MongoDB 7    |  |   Redis 7       |  |    ChromaDB        |
    |  (7 models)    |  |  (Cache/Queue)  |  | (Vector Database)  |
    +----------------+  +--------+--------+  +-------------------+
                                 |
                        +--------+--------+
                        | BullMQ Worker   |
                        | (Doc Processing)|
                        +-----------------+
                                 |
                    +------------+------------+
                    v                         v
           +-------+--------+      +---------+---------+
           |  Voyage AI     |      |    Claude AI      |
           | (Embeddings +  |      |   (Anthropic)     |
           |  Reranking)    |      |  LLM Generation   |
           +----------------+      +-------------------+
```

---

## Features

### Intelligent Document Q&A
- **Conversational AI** — Ask natural language questions, get precise answers with source citations
- **Real-time streaming** — SSE-powered response streaming for instant feedback
- **Context-aware** — Maintains conversation history (last 10 messages) for follow-up questions
- **Anti-hallucination** — System prompt enforces answers strictly from uploaded documents

### Advanced RAG Pipeline
- **Dual-pass retrieval** — Vector similarity search + Voyage AI reranking for top-5 most relevant chunks
- **6 chunking strategies** — Recursive, Semantic, Markdown-aware, Code-aware, Table-aware, Fixed-size
- **Token-accurate splitting** — 500-token chunks with 50-token overlap (configurable)
- **Embedding generation** — Voyage AI `voyage-3` model with batch processing (128 texts/batch)

### Document Processing Engine
- **18+ file formats** — PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, CSV, TXT, HTML, Markdown, PNG, JPG, TIFF, BMP, WebP
- **OCR support** — Tesseract.js for scanned documents and images
- **Enhanced PDF extraction** — Table detection and structure-preserving extraction
- **Async pipeline** — BullMQ workers with 3 concurrent jobs, progress tracking (0-100%), and auto-retry (3 attempts with exponential backoff)

### Enterprise Security
- **JWT authentication** — Access tokens (15m) + Refresh tokens (7d) rotation
- **RBAC** — Role-based access control (Admin, Member, Viewer)
- **4-tier rate limiting** — Standard (60/min), Auth (10/15min), AI (20/min), Upload (50/hr)
- **Data protection** — Helmet headers, CORS, NoSQL injection prevention, bcrypt-12 password hashing

### Multi-Tenancy
- **Company-scoped isolation** — All data queries automatically scoped by tenant
- **Separate vector collections** — Each company gets isolated ChromaDB collections
- **Per-user analytics** — Individual usage tracking and cost monitoring

### Analytics Dashboard
- **Real-time metrics** — Documents, sessions, queries, and token consumption
- **Cost tracking** — Per-request API cost calculation for Claude and Voyage AI
- **Usage trends** — Daily aggregated analytics with Chart.js visualizations
- **Model-aware pricing** — Tracks costs across 5 Claude and 5 Voyage AI model tiers

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework with React Compiler |
| Vite 7 | Build tool with HMR |
| Tailwind CSS 4 | Utility-first styling |
| Zustand 5 | Lightweight state management |
| TanStack Query 5 | Server state & caching |
| React Router 7 | Client-side routing |
| Chart.js | Data visualization |
| React Markdown | Rich content rendering (GFM + syntax highlighting) |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20+ | Runtime (ES Modules) |
| Express 4 | HTTP framework |
| MongoDB 7 + Mongoose 8 | Primary database + ODM |
| Redis 7 + ioredis | Caching & job queue broker |
| BullMQ 5 | Background job processing |
| ChromaDB | Vector database for embeddings |
| Claude AI (Anthropic SDK) | LLM for response generation |
| Voyage AI | Embeddings (`voyage-3`) & Reranking (`rerank-2`) |
| Tesseract.js 7 | OCR for image/scanned documents |
| Winston | Structured logging |
| Joi | Request validation |
| Helmet | Security headers |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker Compose | Container orchestration (6 services) |
| Nginx | Frontend reverse proxy |
| Multi-stage builds | Optimized production images |

---

## Project Structure

```
intellichat/
├── frontend/                          # React 19 SPA
│   ├── src/
│   │   ├── api/                       # API client functions (Axios)
│   │   ├── components/
│   │   │   ├── auth/                  # Login, Register forms
│   │   │   ├── layout/               # Sidebar, Header, Layout
│   │   │   └── ui/                   # Reusable UI components
│   │   ├── context/                   # AuthContext, ThemeContext
│   │   ├── pages/                     # Chat, Documents, Dashboard, Settings
│   │   ├── stores/                    # Zustand stores (chat state)
│   │   ├── lib/                       # Axios config, query client, helpers
│   │   └── routes/                    # Route definitions
│   ├── Dockerfile                     # Multi-stage: Node build + Nginx serve
│   └── package.json
│
├── backend/                           # Express API + Workers
│   ├── src/
│   │   ├── config/                    # DB, Redis, Logger, App config
│   │   ├── controllers/              # Auth, Chat, Document, Stats (4)
│   │   ├── models/                    # User, Company, ChatSession, Message,
│   │   │                              # Document, RefreshToken, UsageMetric (7)
│   │   ├── services/                  # Auth, Chat, Document, RAG, Embedding,
│   │   │                              # VectorStore, TextChunker, TextExtractor,
│   │   │                              # EnhancedPdfExtractor (9)
│   │   ├── middleware/                # Auth, Error, RateLimiter, Tenant,
│   │   │                              # Upload, Validate (7)
│   │   ├── validators/               # Joi schemas for Auth, Chat, Document (12)
│   │   ├── routes/                    # Auth, Chat, Document, Stats, Health (5)
│   │   ├── queues/                    # BullMQ job definitions
│   │   ├── workers/                   # Document processing workers
│   │   └── utils/                     # ApiResponse, ApiError, asyncHandler
│   ├── Dockerfile                     # Node 20-Alpine production image
│   └── package.json
│
├── docker-compose.yml                 # 6 services orchestration
├── .env.example                       # Environment template
└── README.md
```

---

## Getting Started

### Prerequisites

- **Docker** & **Docker Compose** (recommended)
- Or: Node.js 18+, MongoDB 7, Redis 7, ChromaDB
- **API Keys**: [Anthropic](https://console.anthropic.com/) (Claude) + [Voyage AI](https://dash.voyageai.com/) (Embeddings)

### Quick Start with Docker

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/intellichat.git
cd intellichat
```

**2. Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here
VOYAGE_API_KEY=pa-your-key-here

# Security (change in production)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
```

**3. Launch all services**
```bash
docker compose up --build -d
```

**4. Access the application**
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| ChromaDB | http://localhost:8000 |

### Local Development (Without Docker)

**1. Start infrastructure services**
```bash
# MongoDB
mongod --dbpath /data/db

# Redis
redis-server

# ChromaDB
docker run -p 8000:8000 chromadb/chroma:latest
```

**2. Backend**
```bash
cd backend
npm install
cp ../.env.example .env   # Edit with your keys
npm run dev                # API server on :3000
npm run dev:worker         # Document processing worker
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev                # Dev server on :5173
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user + company |
| `POST` | `/api/v1/auth/login` | Login & receive JWT tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Logout (invalidate refresh token) |
| `GET` | `/api/v1/auth/me` | Get current user profile |
| `POST` | `/api/v1/auth/logout-all` | Invalidate all sessions |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/documents/upload` | Upload documents (max 10 files, 50MB each) |
| `GET` | `/api/v1/documents` | List documents (paginated) |
| `GET` | `/api/v1/documents/:id` | Get document details |
| `PATCH` | `/api/v1/documents/:id` | Update document metadata |
| `DELETE` | `/api/v1/documents/:id` | Delete document |
| `GET` | `/api/v1/documents/:id/status` | Check processing status |
| `GET` | `/api/v1/documents/:id/download` | Download original file |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/chat/sessions` | Create chat session |
| `GET` | `/api/v1/chat/sessions` | List sessions |
| `GET` | `/api/v1/chat/sessions/:id` | Get session details |
| `PATCH` | `/api/v1/chat/sessions/:id` | Update session |
| `DELETE` | `/api/v1/chat/sessions/:id` | Delete session |
| `POST` | `/api/v1/chat/sessions/:id/messages` | Send message (SSE streaming) |
| `GET` | `/api/v1/chat/sessions/:id/messages` | Get message history |
| `DELETE` | `/api/v1/chat/sessions/:id/messages` | Clear messages |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/stats/dashboard` | Dashboard metrics |
| `GET` | `/api/v1/stats/usage` | Usage analytics over time |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Basic health check |
| `GET` | `/api/v1/health/detailed` | Detailed service health |

---

## How the RAG Pipeline Works

```
User Question
     |
     v
+----+----+
| Chat    |  1. Receive user query
| Service |  2. Fetch last 10 messages for context
+----+----+
     |
     v
+----+----+
| Vector  |  3. Generate query embedding (Voyage AI)
| Search  |  4. Cosine similarity search in ChromaDB
+----+----+     (fetch 3x results for reranking pool)
     |
     v
+----+----+
| Rerank  |  5. Voyage AI rerank-2 model scores relevance
| Service |  6. Return top-5 most relevant chunks
+----+----+
     |
     v
+----+----+
| Claude  |  7. Build prompt: system instructions + sources + history
| (LLM)  |  8. Stream response via SSE with source citations
+----+----+
     |
     v
  User sees answer with
  [Source: document.pdf, page 3]
```

---

## Document Processing Pipeline

```
Upload (max 10 files, 50MB each)
     |
     v
+----+----------+
| Text          |  Extract text based on file type:
| Extraction    |  - PDF: pdf-parse + enhanced table extraction
|               |  - DOCX: mammoth    - XLSX/CSV: xlsx parser
|               |  - PPTX: officeparser
|               |  - Images: Tesseract.js OCR
|               |  - HTML: cheerio + turndown
+----+----------+
     |
     v
+----+----------+
| Intelligent   |  Split text using optimal strategy:
| Chunking      |  - Recursive (default) - 500 tokens, 50 overlap
|               |  - Table-aware (financial) - 1000 tokens
|               |  - Semantic / Markdown / Code / Fixed
+----+----------+
     |
     v
+----+----------+
| Embedding     |  Generate vectors in batches of 128
| Generation    |  using Voyage AI voyage-3 model
+----+----------+
     |
     v
+----+----------+
| Vector        |  Store in ChromaDB with metadata
| Storage       |  (company-scoped collections)
+----+----------+
     |
     v
  Document status: ready
  (tracked with 0-100% progress)
```

---

## Security Model

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT with access (15m) / refresh (7d) token rotation |
| **Password** | bcrypt with 12 salt rounds |
| **Authorization** | Role-based: Admin, Member, Viewer |
| **Rate Limiting** | 4 tiers — Standard: 60/min, Auth: 10/15min, AI: 20/min, Upload: 50/hr |
| **Input Validation** | 12 Joi schemas with strict type enforcement |
| **Injection Prevention** | express-mongo-sanitize for NoSQL injection |
| **Headers** | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| **CORS** | Origin-based whitelist validation |
| **Tenant Isolation** | All DB queries auto-scoped by company ID |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Claude AI API key |
| `VOYAGE_API_KEY` | Yes | — | Voyage AI API key |
| `JWT_ACCESS_SECRET` | Yes | — | JWT access token secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Yes | — | JWT refresh token secret (32+ chars) |
| `MONGODB_URI` | No | `mongodb://localhost:27017/knowledge_base` | MongoDB connection string |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `CHROMA_HOST` | No | `http://localhost:8000` | ChromaDB URL |
| `PORT` | No | `3000` | Backend server port |
| `MAX_FILE_SIZE_MB` | No | `50` | Max upload file size |
| `LOG_LEVEL` | No | `info` | Logging level |
| `VOYAGE_ENABLE_RERANKING` | No | `true` | Enable/disable reranking |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | CORS allowed origins |

---

## Scripts

### Backend
```bash
npm start          # Start production server
npm run dev        # Start with nodemon (hot reload)
npm run worker     # Start background document worker
npm run dev:worker # Worker with hot reload
npm run lint       # Run ESLint
npm run lint:fix   # Auto-fix lint issues
```

### Frontend
```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Docker
```bash
docker compose up --build -d     # Build & start all services
docker compose down              # Stop all services
docker compose logs -f backend   # Follow backend logs
docker compose logs -f worker    # Follow worker logs
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

---

<p align="center">
  Built with Claude AI, Voyage AI, React 19, Node.js, MongoDB, Redis & ChromaDB
</p>
