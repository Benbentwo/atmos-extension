# RDS Component

This component creates an Amazon RDS database instance with encryption, backups, and security configurations.

## Features

- **Multiple Database Engines**: Support for PostgreSQL, MySQL, MariaDB, etc.
- **Encryption**: KMS encryption for data at rest
- **High Availability**: Multi-AZ deployment option
- **Automated Backups**: Configurable backup retention and windows
- **Security**: VPC security groups and subnet groups

## Usage

```yaml
components:
  terraform:
    rds/example:
      component: rds
      vars:
        name: my-database
        engine: postgres
        engine_version: "15.4"
        instance_class: db.t3.medium
        allocated_storage: 100
        vpc_id: vpc-xxxxx
        subnet_ids:
          - subnet-xxxxx
          - subnet-yyyyy
        multi_az: true
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Name of the RDS instance | string | - | yes |
| engine | Database engine | string | - | yes |
| engine_version | Database engine version | string | - | yes |
| instance_class | RDS instance class | string | "db.t3.medium" | no |
| allocated_storage | Storage in GB | number | 100 | no |
| storage_encrypted | Enable encryption | bool | true | no |
| vpc_id | VPC ID | string | - | yes |
| subnet_ids | Subnet IDs | list(string) | - | yes |
| multi_az | Enable Multi-AZ | bool | false | no |
| backup_retention_period | Backup retention days | number | 7 | no |
| deletion_protection | Enable deletion protection | bool | true | no |

## Outputs

| Name | Description |
|------|-------------|
| db_instance_id | The RDS instance ID |
| db_instance_endpoint | The connection endpoint |
| db_instance_arn | The ARN of the RDS instance |
| security_group_id | The security group ID |
