#!/bin/bash

# AWS EC2 Management Script for PetStore Monolith
# This script manages instances to save costs while preserving infrastructure

set -e

# Configuration
REGION=${AWS_REGION:-"us-east-1"}
ACTION=${1:-"stop"}

echo "⚙️  PetStore AWS Instance Management..."

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

# Function to find PetStore instances (both full and minimal deployments)
find_instances() {
    INSTANCE_IDS=$(aws ec2 describe-instances \
        --region $REGION \
        --filters "Name=tag:Name,Values=PetStore-Monolith,PetStore-Minimal" "Name=instance-state-name,Values=running,stopped" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)
    
    if [ -z "$INSTANCE_IDS" ]; then
        echo "ℹ️  No PetStore instances found"
        exit 0
    fi
    
    echo "🔍 Found instances: $INSTANCE_IDS"
}

# Function to stop instances
stop_instances() {
    echo "🛑 Stopping PetStore instances..."
    
    find_instances
    
    # Check current state
    RUNNING_INSTANCES=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_IDS \
        --region $REGION \
        --filters "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)
    
    if [ -z "$RUNNING_INSTANCES" ]; then
        echo "ℹ️  All instances are already stopped"
        return 0
    fi
    
    aws ec2 stop-instances \
        --instance-ids $RUNNING_INSTANCES \
        --region $REGION
    
    echo "⏳ Waiting for instances to stop..."
    aws ec2 wait instance-stopped --instance-ids $RUNNING_INSTANCES --region $REGION
    
    echo "✅ Instances stopped successfully"
    echo "💰 Cost savings: EC2 instance charges have stopped"
    echo "ℹ️  EBS volume charges continue (minimal cost)"
}

# Function to start instances
start_instances() {
    echo "▶️  Starting PetStore instances..."
    
    find_instances
    
    # Check current state
    STOPPED_INSTANCES=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_IDS \
        --region $REGION \
        --filters "Name=instance-state-name,Values=stopped" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)
    
    if [ -z "$STOPPED_INSTANCES" ]; then
        echo "ℹ️  All instances are already running"
        show_instance_info
        return 0
    fi
    
    aws ec2 start-instances \
        --instance-ids $STOPPED_INSTANCES \
        --region $REGION
    
    echo "⏳ Waiting for instances to start..."
    aws ec2 wait instance-running --instance-ids $STOPPED_INSTANCES --region $REGION
    
    echo "✅ Instances started successfully"
    echo "⏳ Please wait 2-3 minutes for applications to fully start up"
    
    show_instance_info
}

# Function to show current status
show_status() {
    echo "📊 Current PetStore Instance Status:"
    
    find_instances
    
    aws ec2 describe-instances \
        --instance-ids $INSTANCE_IDS \
        --region $REGION \
        --query 'Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress,PrivateIpAddress]' \
        --output table
}

# Function to show instance connection info
show_instance_info() {
    find_instances
    
    PUBLIC_IPS=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_IDS \
        --region $REGION \
        --filters "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].PublicIpAddress' \
        --output text)
    
    if [ -n "$PUBLIC_IPS" ]; then
        echo ""
        echo "🔗 Application URLs:"
        for ip in $PUBLIC_IPS; do
            echo "   • Application: https://$ip"
            echo "   • Grafana: http://$ip:3001"
            echo "   • SSH: ssh -i petstore-keypair.pem ec2-user@$ip"
        done
        echo ""
    fi
}

# Function to show cost information
show_cost_info() {
    echo ""
    echo "💰 Cost Management Information:"
    echo ""
    echo "Stop instances (./stop-aws.sh stop):"
    echo "   • Pauses EC2 hourly charges"
    echo "   • Preserves all data and configuration"
    echo "   • Small EBS storage charges continue"
    echo "   • Can restart anytime"
    echo ""
    echo "Start instances (./stop-aws.sh start):"
    echo "   • Resumes EC2 hourly charges"
    echo "   • All applications auto-start"
    echo "   • May get new public IP addresses"
    echo ""
    echo "Full cleanup (./undeploy-aws.sh):"
    echo "   • Eliminates ALL charges"
    echo "   • Permanently deletes everything"
    echo "   • Requires full redeployment to restore"
}

# Main execution
main() {
    check_aws_cli
    
    case $ACTION in
        "stop")
            stop_instances
            ;;
        "start")
            start_instances
            ;;
        "status")
            show_status
            ;;
        "info")
            show_cost_info
            ;;
        *)
            echo "Usage: ./manage-aws.sh [stop|start|status|info]"
            echo ""
            echo "Commands:"
            echo "  stop   - Stop instances to save costs (default)"
            echo "  start  - Start stopped instances"
            echo "  status - Show current instance status"
            echo "  info   - Show cost management information"
            echo ""
            echo "Examples:"
            echo "  ./manage-aws.sh stop    # Stop instances"
            echo "  ./manage-aws.sh start   # Start instances"
            echo "  ./manage-aws.sh status  # Check status"
            exit 1
            ;;
    esac
}

main "$@"