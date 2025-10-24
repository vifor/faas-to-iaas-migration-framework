#!/bin/bash

# AWS EC2 Deployment Script for PetStore Monolith
# This script deploys the containerized PetStore application to AWS EC2

set -e

# Configuration
REGION=${AWS_REGION:-"us-east-1"}
KEY_PAIR_NAME=${KEY_PAIR_NAME:-"petstore-keypair"}
SECURITY_GROUP_NAME=${SECURITY_GROUP_NAME:-"petstore-sg"}
INSTANCE_TYPE=${INSTANCE_TYPE:-"t3.medium"}
AMI_ID=${AMI_ID:-"ami-0c02fb55956c7d316"}  # Amazon Linux 2 AMI
SUBNET_ID=${SUBNET_ID}
VPC_ID=${VPC_ID}

echo "🚀 Starting PetStore AWS EC2 Deployment..."

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    echo "✅ AWS CLI is configured"
}

# Function to create security group
create_security_group() {
    echo "📋 Creating security group..."
    
    # Check if security group already exists
    if aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $REGION &> /dev/null; then
        echo "✅ Security group $SECURITY_GROUP_NAME already exists"
        SG_ID=$(aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $REGION --query 'SecurityGroups[0].GroupId' --output text)
    else
        SG_ID=$(aws ec2 create-security-group \
            --group-name $SECURITY_GROUP_NAME \
            --description "Security group for PetStore application" \
            --vpc-id $VPC_ID \
            --region $REGION \
            --query 'GroupId' \
            --output text)
        
        # Add inbound rules
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 22 \
            --cidr 0.0.0.0/0 \
            --region $REGION
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0 \
            --region $REGION
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0 \
            --region $REGION
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 3001 \
            --cidr 0.0.0.0/0 \
            --region $REGION
        
        echo "✅ Security group created: $SG_ID"
    fi
}

# Function to create key pair
create_key_pair() {
    echo "🔑 Creating key pair..."
    
    if aws ec2 describe-key-pairs --key-names $KEY_PAIR_NAME --region $REGION &> /dev/null; then
        echo "✅ Key pair $KEY_PAIR_NAME already exists"
    else
        aws ec2 create-key-pair \
            --key-name $KEY_PAIR_NAME \
            --region $REGION \
            --query 'KeyMaterial' \
            --output text > ${KEY_PAIR_NAME}.pem
        
        chmod 400 ${KEY_PAIR_NAME}.pem
        echo "✅ Key pair created and saved as ${KEY_PAIR_NAME}.pem"
    fi
}

# Function to create user data script
create_user_data() {
    cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y docker git

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker
service docker start
usermod -a -G docker ec2-user

# Clone the application (you'll need to update this with your actual repository)
cd /home/ec2-user
git clone https://github.com/your-username/petstore-monolith.git
cd petstore-monolith

# Create environment file
cat > .env << 'ENVEOF'
NODE_ENV=production
AWS_REGION=us-east-1
JWT_SECRET=your-jwt-secret-here
API_KEY=your-api-key-here
DYNAMODB_FRANCHISE_TABLE=petstoreFranchise
DYNAMODB_STORE_TABLE=petstoreTenants
LOG_LEVEL=info
METRICS_ENABLED=true
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123
ENVEOF

# Generate self-signed SSL certificate for demo
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Start the application
docker-compose -f docker-compose.prod.yml up -d

# Set up log rotation
cat > /etc/logrotate.d/petstore << 'LOGEOF'
/home/ec2-user/petstore-monolith/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
LOGEOF

echo "✅ PetStore application deployed successfully!"
EOF
}

# Function to launch EC2 instance
launch_instance() {
    echo "🖥️  Launching EC2 instance..."
    
    create_user_data
    
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_PAIR_NAME \
        --security-group-ids $SG_ID \
        --subnet-id $SUBNET_ID \
        --user-data file://user-data.sh \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=PetStore-Monolith}]' \
        --region $REGION \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo "✅ Instance launched: $INSTANCE_ID"
    
    # Wait for instance to be running
    echo "⏳ Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo "✅ Instance is running!"
    echo "📍 Public IP: $PUBLIC_IP"
    echo "🔗 Application URL: https://$PUBLIC_IP"
    echo "📊 Grafana URL: http://$PUBLIC_IP:3001"
    echo "🔑 SSH Command: ssh -i ${KEY_PAIR_NAME}.pem ec2-user@$PUBLIC_IP"
}

# Function to create CloudWatch alarms
create_cloudwatch_alarms() {
    echo "📊 Creating CloudWatch alarms..."
    
    # CPU Utilization Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "PetStore-HighCPU" \
        --alarm-description "Triggers when CPU exceeds 80%" \
        --metric-name CPUUtilization \
        --namespace AWS/EC2 \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=InstanceId,Value=$INSTANCE_ID \
        --evaluation-periods 2 \
        --region $REGION
    
    # Status Check Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "PetStore-StatusCheck" \
        --alarm-description "Triggers when instance status check fails" \
        --metric-name StatusCheckFailed \
        --namespace AWS/EC2 \
        --statistic Maximum \
        --period 60 \
        --threshold 0 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=InstanceId,Value=$INSTANCE_ID \
        --evaluation-periods 2 \
        --region $REGION
    
    echo "✅ CloudWatch alarms created"
}

# Main execution
main() {
    check_aws_cli
    
    if [ -z "$VPC_ID" ] || [ -z "$SUBNET_ID" ]; then
        echo "❌ VPC_ID and SUBNET_ID environment variables are required"
        echo "Usage: VPC_ID=vpc-xxx SUBNET_ID=subnet-xxx ./deploy-aws.sh"
        exit 1
    fi
    
    create_security_group
    create_key_pair
    launch_instance
    create_cloudwatch_alarms
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "⏳ Please wait 5-10 minutes for the application to fully start up."
    echo "📝 Check the logs with: ssh -i ${KEY_PAIR_NAME}.pem ec2-user@$PUBLIC_IP 'cd petstore-monolith && docker-compose logs'"
}

main "$@"