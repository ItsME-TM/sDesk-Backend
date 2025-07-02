# Quick Start Guide

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start development server:**
   ```bash
   npm run start:dev
   ```

4. **Test the API:**
   - Health check: `GET http://localhost:8000/health`
   - API base: `GET http://localhost:8000`

## Heroku Deployment (Quick Deploy)

1. **Login to Heroku:**
   ```bash
   heroku login
   ```

2. **Create app and deploy:**
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql:essential-0
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   heroku config:set JWT_EXPIRES_IN=24h
   heroku config:set FRONTEND_URL=https://your-frontend-app.herokuapp.com
   
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

3. **Verify deployment:**
   ```bash
   heroku open
   heroku logs --tail
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
