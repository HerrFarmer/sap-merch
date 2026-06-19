#!/bin/bash
# Start the SAP Merch app

echo "Starting SAP Merch app..."

# Start server
cd "$(dirname "$0")/server"
node server.js &
SERVER_PID=$!
echo "Server started (PID $SERVER_PID) on http://localhost:3001"

# Start client
cd "$(dirname "$0")/client"
npm run dev &
CLIENT_PID=$!
echo "Client started (PID $CLIENT_PID) on http://localhost:5173"

echo ""
echo "App running:"
echo "  Order page:  http://localhost:5173"
echo "  Admin page:  http://localhost:5173/admin  (password: admin123)"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait and clean up on exit
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
