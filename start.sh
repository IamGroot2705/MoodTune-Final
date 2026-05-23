#!/usr/bin/env bash
# Run both backend and frontend concurrently (requires 'concurrently' or just two terminals)
# Usage: bash start.sh

echo "Starting MoodTune..."
echo ""
echo "➡  Backend:  http://localhost:8000"
echo "➡  Frontend: http://localhost:5173"
echo ""

# Check if concurrently is installed globally
if command -v concurrently &> /dev/null; then
  concurrently \
    "cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000" \
    "cd frontend && npm run dev"
else
  echo "Running backend in background, frontend in foreground."
  echo "To stop: kill %1 or Ctrl+C both terminals."
  (cd backend && source venv/bin/activate 2>/dev/null || true && uvicorn main:app --reload --port 8000) &
  cd frontend && npm run dev
fi
