# EKS Cluster Component

This component creates an Amazon EKS (Elastic Kubernetes Service) cluster with managed node groups.

## Features

- **Managed Kubernetes**: Fully managed Kubernetes control plane
- **Multiple Node Groups**: Support for multiple node groups with different configurations
- **Encryption**: Optional encryption of Kubernetes secrets using KMS
- **Logging**: Configurable control plane logging
- **Network Configuration**: Flexible public/private endpoint configuration

## Usage

```yaml
components:
  terraform:
    eks/example:
      component: eks/cluster
      vars:
        name: my-eks-cluster
        kubernetes_version: "1.28"
        vpc_id: vpc-xxxxx
        subnet_ids:
          - subnet-xxxxx
          - subnet-yyyyy
        node_groups:
          main:
            desired_size: 3
            min_size: 2
            max_size: 5
            instance_types:
              - t3.medium
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Name of the EKS cluster | string | - | yes |
| kubernetes_version | Kubernetes version | string | "1.28" | no |
| vpc_id | VPC ID | string | - | yes |
| subnet_ids | Subnet IDs for the cluster | list(string) | - | yes |
| cluster_endpoint_private_access | Enable private endpoint | bool | true | no |
| cluster_endpoint_public_access | Enable public endpoint | bool | true | no |
| enabled_cluster_log_types | Control plane log types | list(string) | ["api", "audit", "authenticator"] | no |
| cluster_encryption_config_enabled | Enable secrets encryption | bool | true | no |
| node_groups | Node group configurations | map(object) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | The name/id of the EKS cluster |
| cluster_arn | The ARN of the EKS cluster |
| cluster_endpoint | Endpoint for the Kubernetes API server |
| cluster_security_group_id | Security group ID attached to the cluster |
