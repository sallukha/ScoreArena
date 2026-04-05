# Server Deployment

## AWS Elastic Beanstalk

1. Create `server/.env` from `server/.env.example`.
2. Set production values for MongoDB, JWT, Firebase Admin, and origins.
3. Install dependencies:
   `npm install`
4. Build:
   `npm run build`
5. Deploy the `server/` app to Elastic Beanstalk with Node.js platform.
6. Configure environment variables in the Elastic Beanstalk console.
7. Attach an Application Load Balancer and TLS certificate if needed.
8. Validate `/api/health` and `/api/ready`.

Suggested Elastic Beanstalk settings:

- Health check path: `/api/health`
- Instance profile with access to CloudWatch logs if you use it
- Environment variables managed in EB, not committed to git
- Reverse proxy or ALB in front of the Node process

## EC2 + PM2

1. Launch an EC2 instance and install Node.js.
2. Copy the `server/` directory to the machine.
3. Run `npm install`.
4. Run `npm run build`.
5. Start with PM2:
   `pm2 start ecosystem.config.cjs`
6. Save the PM2 process list:
   `pm2 save`
7. Put Nginx or an AWS load balancer in front of the app.

Typical EC2 flow:

1. `cd server`
2. `npm install`
3. `npm run build`
4. `pm2 start ecosystem.config.cjs`
5. `pm2 save`
6. Point Nginx to `http://127.0.0.1:3000`

## Recommended AWS Layout

- Backend API: EC2 or Elastic Beanstalk
- Static frontend: S3 + CloudFront
- Database: MongoDB Atlas
- Secrets: AWS Systems Manager Parameter Store or Secrets Manager
