#!/bin/bash

# AWS EC2 Minimal Deployment Script for PetStore Monolith
# Ultra-low-cost deployment without monitoring stack (Prometheus/Grafana)

set -e

# Configuration - Minimal cost options
REGION=${AWS_REGION:-"sa-east-1"}
KEY_PAIR_NAME=${KEY_PAIR_NAME:-"petstore-keypair"}
SECURITY_GROUP_NAME=${SECURITY_GROUP_NAME:-"petstore-sg"}
INSTANCE_TYPE=${INSTANCE_TYPE:-"t3.micro"}  # Ultra low cost: ~$10/month in sa-east-1
# Auto-discover latest Amazon Linux 2023 AMI if not explicitly set
AMI_ID=${AMI_ID:-$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-*" "Name=architecture,Values=x86_64" \
    --region "$REGION" \
    --query "sort_by(Images,&CreationDate)[-1].ImageId" \
    --output text)}
SUBNET_ID=${SUBNET_ID}
VPC_ID=${VPC_ID}

echo "🚀 Starting PetStore Minimal AWS EC2 Deployment..."

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

# Function to create security group with minimal ports
create_security_group() {
    echo "📋 Creating minimal security group..."
    
    # Check if security group already exists
    if aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $REGION &> /dev/null; then
        echo "✅ Security group $SECURITY_GROUP_NAME already exists"
        SG_ID=$(aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $REGION --query 'SecurityGroups[0].GroupId' --output text)
    else
        SG_ID=$(aws ec2 create-security-group \
            --group-name $SECURITY_GROUP_NAME \
            --description "Minimal security group for PetStore application" \
            --vpc-id $VPC_ID \
            --region $REGION \
            --query 'GroupId' \
            --output text)
        
        # Add minimal inbound rules - SSH restricted to user's IP
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 22 \
            --cidr ${SSH_CIDR:-"$(curl -s https://ipinfo.io/ip)/32"} \
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
            --port 3000 \
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

# Function to create minimal user data script
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

# Clone the application repository
cd /home/ec2-user
git clone https://github.com/vifor/faas-to-iaas-migration-framework.git
cd faas-to-iaas-migration-framework/src/monolith-app

# Create minimal environment file (no monitoring)
cat > .env << 'ENVEOF'
NODE_ENV=production
AWS_REGION=${AWS_REGION:-sa-east-1}
TABLE_REGION=${TABLE_REGION:-${AWS_REGION:-sa-east-1}}
ENV=${ENV:-main}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
ADMIN_API_KEY=${ADMIN_API_KEY:-$(openssl rand -hex 24)}
# DynamoDBService derives table names from ENV (for example, petstoreFranchise${suffix}
# and petstoreTenants${suffix}); FRANCHISE_TABLE_NAME and TENANTS_TABLE_NAME are not
# consumed by the application and are intentionally not written here.
DYNAMODB_ENDPOINT=
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
LOG_LEVEL=${LOG_LEVEL:-warn}
METRICS_ENABLED=false
ENVEOF

# Do not print generated secrets to bootstrap logs
echo "Generated application secrets and stored them in .env"

# Start only the application (no monitoring stack)
docker-compose -f docker-compose.prod.yml up -d petstore-app

echo "✅ PetStore minimal application deployed successfully!"
EOF
}

# Function to launch EC2 instance
launch_instance() {
    echo "🖥️  Launching minimal EC2 instance..."
    
    create_user_data
    
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_PAIR_NAME \
        --security-group-ids $SG_ID \
        --subnet-id $SUBNET_ID \
        --user-data file://user-data.sh \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=PetStore-Minimal}]' \
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
    echo "🔗 Application URL: http://$PUBLIC_IP:3000"
    echo "🔑 SSH Command: ssh -i ${KEY_PAIR_NAME}.pem ec2-user@$PUBLIC_IP"
}

# Main execution
main() {
    check_aws_cli
    
    if [ -z "$VPC_ID" ] || [ -z "$SUBNET_ID" ]; then
        echo "❌ VPC_ID and SUBNET_ID environment variables are required"
        echo "Usage: VPC_ID=vpc-xxx SUBNET_ID=subnet-xxx ./deploy-minimal-aws.sh"
        echo "Optional: JWT_SECRET, API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
        exit 1
    fi
    
    create_security_group
    create_key_pair
    launch_instance
    
    echo ""
    echo "🎉 Minimal deployment completed successfully!"
    echo "💰 Monthly cost: ~$7.50 for t3.micro instance"
    echo "⏳ Please wait 3-5 minutes for the application to fully start up."
    echo "📝 Check the logs with: ssh -i ${KEY_PAIR_NAME}.pem ec2-user@$PUBLIC_IP 'cd faas-to-iaas-migration-framework/src/monolith-app && docker-compose logs petstore-app'"
}

main "$@"