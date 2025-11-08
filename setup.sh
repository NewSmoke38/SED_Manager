#!/bin/bash

echo "🚀 Setting up Edge Device Manager..."
echo ""

# Create .env file for backend
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file..."
    cat > backend/.env << EOF
PORT=3001
NODE_ENV=development

# Default device configuration
DEFAULT_SSH_HOST=localhost
DEFAULT_SSH_PORT=2222
DEFAULT_SSH_USER=root
DEFAULT_SSH_PASSWORD=toor
EOF
    echo "✅ Created backend/.env"
else
    echo "⏭️  backend/.env already exists"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend dependencies  
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Make sure your Docker container is running:"
echo "      docker ps"
echo ""
echo "   2. Start the application:"
echo "      npm run dev"
echo ""
echo "   3. Open your browser to:"
echo "      http://localhost:3000"
echo ""
echo "Happy monitoring! 🎉"


