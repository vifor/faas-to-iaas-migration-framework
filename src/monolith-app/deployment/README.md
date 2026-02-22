# AWS Deployment Scripts

This directory contains scripts for managing the PetStore monolith deployment on AWS EC2.

## Scripts Overview

### 🚀 deploy-aws.sh
**Purpose**: Deploy the complete PetStore infrastructure to AWS EC2
- Creates EC2 instances, security groups, key pairs
- Sets up monitoring with Prometheus/Grafana
- Configures SSL certificates and nginx
- Creates CloudWatch alarms

**Usage**:
```bash
VPC_ID=vpc-xxx SUBNET_ID=subnet-xxx JWT_SECRET=xxx API_KEY=xxx ./deploy-aws.sh
```

**Required Environment Variables**:
- `VPC_ID`: Your AWS VPC ID
- `SUBNET_ID`: Subnet ID for deployment

**Recommended Environment Variables**:
- `JWT_SECRET`: Secret key for JWT tokens (auto-generated if not provided)
- `API_KEY`: API key for admin endpoints (auto-generated if not provided)
- `GRAFANA_ADMIN_PASSWORD`: Grafana admin password (auto-generated if not provided)
- `AWS_ACCESS_KEY_ID`: AWS access key (or use IAM role)
- `AWS_SECRET_ACCESS_KEY`: AWS secret key (or use IAM role)

### 🏃‍♂️ deploy-minimal-aws.sh (Ultra Low Cost)
**Purpose**: Deploy only the PetStore application without monitoring stack
- **Cost**: ~$7.50/month (t3.micro vs $15/month t3.small)  
- Minimal resource usage (1GB RAM vs 2GB)
- No Prometheus/Grafana (saves ~400MB RAM)
- Direct application access on port 3000
- Perfect for development/testing

**Usage**:
```bash
VPC_ID=vpc-xxx SUBNET_ID=subnet-xxx ./deploy-minimal-aws.sh
```

**Cost Comparison**:
- Minimal: ~$7.50/month (t3.micro)
- Standard: ~$15/month (t3.small) 
- Full: ~$30/month (t3.medium)

### ⚙️ manage-aws.sh
**Purpose**: Manage infrastructure to save costs while preserving data
- Stops EC2 instances (stops hourly charges)
- Preserves all data and configuration
- Can restart anytime

**Usage**:
```bash
./manage-aws.sh stop    # Stop instances
./manage-aws.sh start   # Start instances
./manage-aws.sh status  # Check status
./manage-aws.sh info    # Show cost info
```

### 🗑️ undeploy-aws.sh
**Purpose**: Completely remove all AWS resources
- Terminates EC2 instances
- Deletes security groups, key pairs
- Removes CloudWatch alarms
- **WARNING**: This action cannot be undone!

**Usage**:
```bash
./undeploy-aws.sh
```

## Cost Management Strategy

### 💡 Development/Testing Workflow
1. **Deploy Minimal**: `./deploy-minimal-aws.sh` (~$7.50/month)
2. **Deploy Standard**: `./deploy-aws.sh` (~$15/month with monitoring)  
2. **Pause when not using**: `./manage-aws.sh stop` (saves ~80% costs)
3. **Resume when needed**: `./manage-aws.sh start`
5. **Clean up completely**: `./undeploy-aws.sh` (removes everything)

### 💰 Detailed Cost Optimization
See [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md) for:
- Spot instances (50-90% savings)
- Reserved instances (30-60% savings)  
- Burstable performance options
- Monitoring stack removal
- Advanced AWS optimizations

### 💰 Cost Breakdown
- **Running Standard**: ~$15/month (t3.small + EBS)
- **Running Minimal**: ~$7.50/month (t3.micro + EBS)
- **Stopped**: ~$2-3/month (EBS storage only)  
- **Undeployed**: $0/month

## Security Best Practices

1. **Use IAM roles** instead of AWS access keys when possible
2. **Restrict SSH access** in security groups to your IP range
3. **Change default passwords** for Grafana and other services
4. **Use strong JWT secrets** in production
5. **Enable HTTPS** (self-signed certs included for demo)

## Troubleshooting

### Common Issues
- **"VPC_ID required"**: Set environment variables correctly
- **"Access denied"**: Check AWS credentials and IAM permissions
- **"Security group in use"**: Wait 30 seconds after stopping instances before undeploying
- **"Instance not found"**: Verify the correct AWS region

### Getting Help
```bash
./deploy-aws.sh --help      # Not available yet
./stop-aws.sh --help        # Shows usage info
./undeploy-aws.sh --help    # Shows detailed info
```

### Monitoring
- **Application**: `https://<instance-ip>`
- **Grafana**: `http://<instance-ip>:3001`
- **SSH**: `ssh -i petstore-keypair.pem ec2-user@<instance-ip>`
- **Logs**: `cd faas-to-iaas-migration-framework/src/monolith-app && docker-compose logs`