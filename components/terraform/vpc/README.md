# VPC Component

This component creates a VPC with public and private subnets across multiple availability zones.

## Features

- **Multi-AZ Support**: Creates subnets across multiple availability zones for high availability
- **Public & Private Subnets**: Separate subnet tiers for different workload types
- **NAT Gateway**: Optional NAT Gateway for private subnet internet access
- **DNS Support**: Configurable DNS hostnames and resolution

## Usage

```yaml
components:
  terraform:
    vpc/example:
      component: vpc
      vars:
        name: my-vpc
        cidr_block: "10.0.0.0/16"
        region: us-east-1
        availability_zones:
          - a
          - b
          - c
        nat_gateway_enabled: true
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Name of the VPC | string | - | yes |
| cidr_block | CIDR block for the VPC | string | "10.0.0.0/16" | no |
| region | AWS region | string | - | yes |
| availability_zones | List of AZ suffixes | list(string) | ["a", "b", "c"] | no |
| nat_gateway_enabled | Enable NAT Gateway | bool | true | no |
| dns_hostnames_enabled | Enable DNS hostnames | bool | true | no |
| dns_support_enabled | Enable DNS support | bool | true | no |
| tags | Resource tags | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | The ID of the VPC |
| vpc_cidr_block | The CIDR block of the VPC |
| public_subnet_ids | List of public subnet IDs |
| private_subnet_ids | List of private subnet IDs |
| nat_gateway_ids | List of NAT Gateway IDs |
| internet_gateway_id | The Internet Gateway ID |
