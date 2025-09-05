# Jenkins CI/CD Setup for Ramesh Traders Backend

This document provides a complete guide for setting up Jenkins CI/CD pipeline for the Ramesh Traders Backend API.

## Prerequisites

### 1. Jenkins Server Requirements
- Jenkins 2.400+ with Blue Ocean plugin
- Docker and Docker Compose installed
- Node.js 18+ (for local builds)
- Git configured
- Access to your Docker registry

### 2. Required Jenkins Plugins
Install these plugins in Jenkins:
- Docker Pipeline
- Docker
- Git
- Blue Ocean
- Slack Notification (optional)
- Email Extension (optional)

## Jenkins Configuration

### 1. Global Tools Configuration
1. Go to **Manage Jenkins** → **Global Tool Configuration**
2. Configure:
   - **Docker**: Name: `docker`, Install automatically: ✅
   - **NodeJS**: Name: `nodejs-18`, Version: `18.x`, Install automatically: ✅

### 2. Credentials Setup
Add these credentials in **Manage Jenkins** → **Credentials**:

#### Docker Registry Credentials
- Kind: `Username with password`
- ID: `docker-registry`
- Username: Your registry username
- Password: Your registry password/token

#### Database Credentials
- Kind: `Secret text`
- ID: `db-password`
- Secret: Your database password

#### Cloudinary Credentials
- Kind: `Secret text`
- ID: `cloudinary-api-secret`
- Secret: Your Cloudinary API secret

### 3. Environment Variables
Add these in **Manage Jenkins** → **Configure System** → **Global Properties**:
- `DOCKER_REGISTRY`: your-registry.com
- `NODE_ENV`: production

## Pipeline Setup

### 1. Create New Pipeline Job
1. Click **New Item**
2. Enter name: `rameshtraders-be-pipeline`
3. Select **Pipeline**
4. Click **OK**

### 2. Configure Pipeline
1. **General**:
   - ✅ GitHub project
   - Project url: Your GitHub repository URL

2. **Build Triggers**:
   - ✅ GitHub hook trigger for GITScm polling
   - ✅ Poll SCM: `H/5 * * * *` (every 5 minutes)

3. **Pipeline**:
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: Your repository URL
   - Credentials: Your Git credentials
   - Branch: `*/main` and `*/develop`
   - Script Path: `Jenkinsfile`

## Environment-Specific Configuration

### Development Environment
```bash
# .env.development
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=dev_password
DB_NAME=rameshtraders_dev
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Staging Environment
```bash
# .env.staging
NODE_ENV=staging
DB_HOST=staging-db-host
DB_USER=staging_user
DB_PASSWORD=staging_password
DB_NAME=rameshtraders_staging
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Production Environment
```bash
# .env.production
NODE_ENV=production
DB_HOST=prod-db-host
DB_USER=prod_user
DB_PASSWORD=prod_password
DB_NAME=rameshtraders_prod
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Deployment Strategies

### 1. Docker Compose Deployment
For simple deployments:
```bash
# Staging
docker-compose -f docker-compose.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Kubernetes Deployment
For scalable deployments:
```bash
kubectl apply -f k8s/
```

### 3. Manual Deployment
Use the deployment script:
```bash
# Make script executable (Linux/Mac)
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

## Pipeline Stages Explained

### 1. Checkout
- Clones the repository
- Extracts short commit hash for tagging

### 2. Install Dependencies
- Runs `npm ci` for production dependencies
- Ensures consistent builds

### 3. Run Tests
- Executes test suite
- Publishes test results
- Continues on test failures (configurable)

### 4. Code Quality Check
- Runs linting (if configured)
- Can be extended with security scans

### 5. Build Docker Image
- Builds Docker image with version tags
- Tags with branch, build number, and commit hash

### 6. Push to Registry
- Pushes images to Docker registry
- Only for main and develop branches

### 7. Deploy to Staging
- Automatic deployment for develop branch
- Uses staging environment configuration

### 8. Deploy to Production
- Manual approval required for main branch
- Uses production environment configuration

## Monitoring and Notifications

### 1. Health Checks
The application includes health check endpoints:
- `GET /` - Basic health check
- Docker health checks configured
- Kubernetes liveness/readiness probes

### 2. Logging
- Application logs to stdout
- Docker logs accessible via `docker logs`
- Kubernetes logs via `kubectl logs`

### 3. Notifications (Optional)
Configure Slack or email notifications:
```groovy
post {
    failure {
        slackSend channel: '#deployments',
                  color: 'danger',
                  message: "Deployment failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
    }
    success {
        slackSend channel: '#deployments',
                  color: 'good',
                  message: "Deployment successful: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
    }
}
```

## Troubleshooting

### Common Issues

1. **Docker Build Fails**
   - Check Dockerfile syntax
   - Verify all required files are present
   - Check .dockerignore configuration

2. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Ensure database is running

3. **Cloudinary Upload Issues**
   - Verify Cloudinary credentials
   - Check file size limits
   - Verify upload folder permissions

4. **Tests Failing**
   - Check test database configuration
   - Verify all dependencies are installed
   - Review test output logs

### Debug Commands
```bash
# Check Docker containers
docker ps -a

# View application logs
docker logs <container_id>

# Check database connection
docker exec -it <container_id> mysql -h <db_host> -u <user> -p

# Test API endpoints
curl -f http://localhost:4001/
```

## Security Considerations

1. **Environment Variables**
   - Never commit sensitive data to repository
   - Use Jenkins credentials for secrets
   - Rotate credentials regularly

2. **Docker Security**
   - Use non-root user in containers
   - Keep base images updated
   - Scan images for vulnerabilities

3. **Network Security**
   - Use HTTPS in production
   - Configure proper CORS settings
   - Implement rate limiting

## Maintenance

### Regular Tasks
1. Update dependencies monthly
2. Review and rotate credentials quarterly
3. Monitor application performance
4. Update Docker base images
5. Review and update Jenkins plugins

### Backup Strategy
1. Database backups (automated)
2. Application configuration backups
3. Jenkins configuration backups
4. Docker image backups

## Support

For issues or questions:
1. Check Jenkins build logs
2. Review application logs
3. Verify environment configuration
4. Test locally with Docker Compose
5. Contact system administrator

---

**Note**: This setup assumes you have a Docker registry accessible from your Jenkins server. Adjust the registry configuration based on your infrastructure.

