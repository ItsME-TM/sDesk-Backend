# Heroku Deployment Checklist

## Pre-deployment Checklist

### 1. Environment Setup
- [ ] Heroku CLI installed
- [ ] Git repository initialized
- [ ] All code committed to Git
- [ ] `.env.example` file created with all required variables

### 2. Code Review
- [ ] All database configurations use environment variables
- [ ] CORS settings configured for production
- [ ] Port configuration uses `process.env.PORT`
- [ ] Error handling in place
- [ ] Logging configured properly

### 3. Dependencies
- [ ] All dependencies listed in `package.json`
- [ ] Build scripts configured correctly
- [ ] Production dependencies vs dev dependencies correctly separated

## Deployment Steps

### Step 1: Create Heroku App
```bash
heroku create your-backend-app-name
```

### Step 2: Add PostgreSQL Database
```bash
heroku addons:create heroku-postgresql:essential-0
```

### Step 3: Set Environment Variables
```bash
# Required environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set JWT_EXPIRES_IN=24h

# Replace with your actual frontend URL
heroku config:set FRONTEND_URL=https://your-frontend-app.herokuapp.com

# Optional: Microsoft OAuth (if using)
heroku config:set MICROSOFT_CLIENT_ID=your_client_id
heroku config:set MICROSOFT_CLIENT_SECRET=your_client_secret
heroku config:set MICROSOFT_REDIRECT_URI=https://your-backend-app.herokuapp.com/auth/microsoft/callback
```

### Step 4: Deploy
```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

### Step 5: Verify Deployment
```bash
heroku logs --tail
heroku open
```

## Post-deployment

### 1. Test API Endpoints
- [ ] Health check endpoint responds
- [ ] Authentication endpoints work
- [ ] Database connection successful
- [ ] CORS working with frontend

### 2. Monitor
- [ ] Check Heroku logs for errors
- [ ] Monitor application performance
- [ ] Set up error tracking (optional)

### 3. Database Setup (if needed)
```bash
# If you have database migrations/seeders
heroku run npm run migration:run
heroku run npm run seed:run
```

## Environment Variables Reference

### Required
- `NODE_ENV=production`
- `PORT` (automatically set by Heroku)
- `DATABASE_URL` (automatically set by PostgreSQL addon)
- `JWT_SECRET` (generate securely)
- `JWT_EXPIRES_IN` (e.g., "24h")
- `FRONTEND_URL` (your frontend app URL)

### Optional
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI`

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check if all dependencies are listed in `package.json`
   - Verify TypeScript compilation works locally
   - Check for missing environment variables

2. **App Crashes**
   - Check logs: `heroku logs --tail`
   - Verify database connection
   - Check port configuration

3. **CORS Issues**
   - Verify `FRONTEND_URL` environment variable
   - Check CORS configuration in `main.ts`

4. **Database Connection Issues**
   - Verify PostgreSQL addon is attached
   - Check if `DATABASE_URL` is set
   - Ensure database configuration in your app module

### Useful Commands
```bash
# View logs
heroku logs --tail

# View config vars
heroku config

# Restart app
heroku restart

# Access database
heroku pg:psql

# Run commands on Heroku
heroku run <command>
```

## Security Checklist

- [ ] JWT secret is secure and not hardcoded
- [ ] Database credentials are not in code
- [ ] CORS properly configured
- [ ] Environment variables properly set
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production

## Performance Optimization

- [ ] Enable gzip compression
- [ ] Set appropriate cache headers
- [ ] Optimize database queries
- [ ] Monitor response times
- [ ] Consider CDN for static assets

## Backup Strategy

- [ ] Database backup schedule (Heroku Postgres Continuous Protection)
- [ ] Code backup in Git repository
- [ ] Environment variables documented
