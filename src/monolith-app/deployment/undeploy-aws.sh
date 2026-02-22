#!/bin/bash

# AWS EC2 Undeploy Script for PetStore Monolith
# This script removes all AWS resources created by deploy-aws.sh

set -e

# Configuration
REGION=${AWS_REGION:-"us-east-1"}
KEY_PAIR_NAME=${KEY_PAIR_NAME:-"petstore-keypair"}
SECURITY_GROUP_NAME=${SECURITY_GROUP_NAME:-"petstore-sg"}

echo "🗑️  Starting PetStore AWS Infrastructure Cleanup..."

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

# Function to terminate instances
terminate_instances() {
    echo "🖥️  Terminating PetStore instances..."
    
    # Find instances with PetStore tags (both full and minimal deployments)
    INSTANCE_IDS=$(aws ec2 describe-instances \
        --region $REGION \
        --filters "Name=tag:Name,Values=PetStore-Monolith,PetStore-Minimal" "Name=instance-state-name,Values=running,stopped" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)
    
    if [ -z "$INSTANCE_IDS" ]; then
        echo "ℹ️  No PetStore instances found to terminate"
        return 0
    fi
    
    echo "🔍 Found instances: $INSTANCE_IDS"
    
    # Confirm before termination
    read -p "⚠️  Are you sure you want to TERMINATE these instances? This action cannot be undone. (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Termination cancelled"
        exit 1
    fi
    
    aws ec2 terminate-instances \
        --instance-ids $INSTANCE_IDS \
        --region $REGION
    
    echo "⏳ Waiting for instances to terminate..."
    aws ec2 wait instance-terminated --instance-ids $INSTANCE_IDS --region $REGION
    
    echo "✅ Instances terminated successfully"
}

# Function to delete CloudWatch alarms
delete_cloudwatch_alarms() {
    echo "📊 Deleting CloudWatch alarms..."
    
    # List of alarm names created by deploy script
    ALARM_NAMES=("PetStore-HighCPU" "PetStore-StatusCheck")
    
    for alarm in "${ALARM_NAMES[@]}"; do
        if aws cloudwatch describe-alarms --alarm-names $alarm --region $REGION --query 'MetricAlarms[0].AlarmName' --output text 2>/dev/null | grep -q $alarm; then
            aws cloudwatch delete-alarms --alarm-names $alarm --region $REGION
            echo "✅ Deleted alarm: $alarm"
        else
            echo "ℹ️  Alarm $alarm not found"
        fi
    done
}

# Function to delete security group
delete_security_group() {
    echo "🔒 Deleting security group..."
    
    if aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $REGION &> /dev/null; then
        SG_ID=$(aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $REGION --query 'SecurityGroups[0].GroupId' --output text)
        
        # Wait a bit to ensure instances are fully terminated
        echo "⏳ Waiting for resources to be fully released..."
        sleep 30
        
        aws ec2 delete-security-group --group-id $SG_ID --region $REGION
        echo "✅ Security group deleted: $SG_ID"
    else
        echo "ℹ️  Security group $SECURITY_GROUP_NAME not found"
    fi
}

# Function to delete key pair
delete_key_pair() {
    echo "🔑 Deleting key pair..."
    
    if aws ec2 describe-key-pairs --key-names $KEY_PAIR_NAME --region $REGION &> /dev/null; then
        aws ec2 delete-key-pair --key-name $KEY_PAIR_NAME --region $REGION
        echo "✅ Key pair deleted: $KEY_PAIR_NAME"
        
        # Remove local key file if it exists
        if [ -f "${KEY_PAIR_NAME}.pem" ]; then
            rm -f "${KEY_PAIR_NAME}.pem"
            echo "✅ Local key file removed: ${KEY_PAIR_NAME}.pem"
        fi
    else
        echo "ℹ️  Key pair $KEY_PAIR_NAME not found"
    fi
}

# Function to clean up local files
cleanup_local_files() {
    echo "🧹 Cleaning up local deployment files..."
    
    if [ -f "user-data.sh" ]; then
        rm -f "user-data.sh"
        echo "✅ Removed user-data.sh"
    fi
    
    echo "✅ Local cleanup completed"
}

# Function to show cost savings info
show_cost_info() {
    echo ""
    echo "💰 Cost Savings Information:"
    echo "   • EC2 instances: No longer incurring hourly charges"
    echo "   • EBS volumes: Deleted with terminated instances"
    echo "   • Security Groups, Key Pairs: No charges (but removed for cleanup)"
    echo "   • CloudWatch alarms: No longer monitoring (minimal cost impact)"
    echo ""
    echo "ℹ️  To redeploy later, simply run deploy-aws.sh again with the same parameters"
}

# Main execution
main() {
    check_aws_cli
    terminate_instances
    delete_cloudwatch_alarms
    delete_security_group
    delete_key_pair
    cleanup_local_files
    show_cost_info
    
    echo "🎉 Infrastructure cleanup completed successfully!"
    echo "💸 AWS costs for PetStore infrastructure have been eliminated"
}

# Show usage
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: ./undeploy-aws.sh"
    echo ""
    echo "This script will permanently delete all AWS resources created by deploy-aws.sh:"
    echo "  • Terminate all PetStore EC2 instances"
    echo "  • Delete security groups"
    echo "  • Delete key pairs"
    echo "  • Delete CloudWatch alarms"
    echo "  • Clean up local files"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION (default: us-east-1)"
    echo "  KEY_PAIR_NAME (default: petstore-keypair)"
    echo "  SECURITY_GROUP_NAME (default: petstore-sg)"
    echo ""
    echo "⚠️  WARNING: This action cannot be undone!"
    exit 0
fi

main "$@"