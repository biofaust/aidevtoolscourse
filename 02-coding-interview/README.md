## Collaborative Interview Platform

Realtime coding rooms with shared editing, language-aware syntax highlighting, and safe in-browser execution for JavaScript/TypeScript/Python/C++.

### Stack
- Frontend: React + Vite, CodeMirror for multi-language highlighting, sandboxed Web Worker + WASM runtimes (Runno: QuickJS, Python, clang++) for execution
- Backend: Express + Socket.IO for room management and realtime relays

### Prerequisites
- Node.js 20.19+ (bundled locally at `~/node-v22.12.0`). If needed, prefix commands with `PATH="/home/biofaust/node-v22.12.0/bin:$PATH"`.

### Getting started
```sh
# Backend
cd backend
PATH="/home/biofaust/node-v22.12.0/bin:$PATH" npm install
PATH="/home/biofaust/node-v22.12.0/bin:$PATH" npm run dev

# Frontend (separate terminal)
cd frontend
PATH="/home/biofaust/node-v22.12.0/bin:$PATH" npm install
VITE_API_URL=http://localhost:3001 PATH="/home/biofaust/node-v22.12.0/bin:$PATH" npm run dev
```

Visit the Vite dev server URL, create a room, and share the link (`?session=<id>`) with candidates. Everyone connected to the room sees live code updates; sandbox runs are shared to all collaborators.

### Docker
Build and run the combined frontend+backend container:
```sh
docker build -t interview-collab .
docker run --rm -p 3001:3001 interview-collab
```
The backend will serve the built frontend from `frontend/dist` on port `3001`.

### Execution model
- All code execution happens client-side via WASM. JavaScript/TypeScript run through the QuickJS runtime; Python via the Python runtime; C++ compiles/runs through `clang++` (all provided by Runno). Other languages are edited with syntax highlighting but not executed.

### Run both client and server together
From the repository root:
```sh
PATH="/home/biofaust/node-v22.12.0/bin:$PATH" npm run dev
```
This uses `concurrently` to start `backend:npm run dev` and `frontend:npm run dev` with prefixed logs.

### Integration tests
```sh
cd backend
PATH="/home/biofaust/node-v22.12.0/bin:$PATH" npm test
```
The suite spins up the Express + Socket.IO server, hits the HTTP endpoints, and verifies realtime sync (code updates + run result broadcast) between two socket clients.
