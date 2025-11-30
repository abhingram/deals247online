#!/bin/bash

# Deals247 Production Deployment Script
# Usage: ./deploy.sh [environment] [platform]
# Example: ./deploy.sh production vercel

set -e

ENVIRONMENT=${1:-production}
PLATFORM=${2:-vercel}

echo "🚀 Deploying Deals247 to $PLATFORM ($ENVIRONMENT)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi

    case $PLATFORM in
        vercel)
            if ! command -v vercel &> /dev/null; then
                print_warning "Vercel CLI not found. Installing..."
                npm install -g vercel
            fi
            ;;
        railway)
            if ! command -v railway &> /dev/null; then
                print_warning "Railway CLI not found. Installing..."
                npm install -g @railway/cli
            fi
            ;;
    esac

    print_success "Dependencies check passed"
}

# Build the application
build_app() {
    print_status "Building application..."

    # Install dependencies
    npm install

    # Build frontend
    npm run build

    print_success "Application built successfully"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."

    # Deploy backend
    print_status "Deploying backend..."
    cd server
    vercel --prod --yes
    BACKEND_URL=$(vercel --prod 2>/dev/null | grep -o 'https://[^ ]*')

    # Deploy frontend
    print_status "Deploying frontend..."
    cd ..
    VITE_API_URL="$BACKEND_URL/api" vercel --prod --yes

    print_success "Deployed to Vercel successfully"
    print_status "Frontend URL: $(vercel --prod 2>/dev/null | grep -o 'https://[^ ]*')"
    print_status "Backend URL: $BACKEND_URL"
}

# Deploy to Railway
deploy_railway() {
    print_status "Deploying to Railway..."

    # Check if logged in
    if ! railway status &> /dev/null; then
        print_error "Please login to Railway first: railway login"
        exit 1
    fi

    # Deploy
    railway deploy --detach

    print_success "Deployed to Railway successfully"
    print_status "Check your Railway dashboard for the deployment status"
}

# Deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."

    # Check if docker and docker-compose are installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Build and start services
    docker-compose up -d --build

    print_success "Deployed with Docker successfully"
    print_status "Application is running on:"
    print_status "  Frontend: http://localhost:3000"
    print_status "  Backend: http://localhost:5000"
    print_status "  Database: localhost:3306"
}

# Main deployment logic
main() {
    check_dependencies
    build_app

    case $PLATFORM in
        vercel)
            deploy_vercel
            ;;
        railway)
            deploy_railway
            ;;
        docker)
            deploy_docker
            ;;
        *)
            print_error "Unsupported platform: $PLATFORM"
            print_status "Supported platforms: vercel, railway, docker"
            exit 1
            ;;
    esac

    print_success "🎉 Deployment completed!"
    print_status "Don't forget to:"
    print_status "  1. Update your domain DNS settings"
    print_status "  2. Configure SSL certificates"
    print_status "  3. Set up monitoring and backups"
    print_status "  4. Test all functionality"
}

# Run main function
main "$@"