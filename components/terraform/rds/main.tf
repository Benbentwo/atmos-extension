terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# RDS Database Component
# This component creates an RDS database instance

resource "aws_db_instance" "main" {
  identifier = var.name

  engine         = var.engine
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = var.storage_encrypted
  kms_key_id            = var.storage_encrypted ? aws_kms_key.rds[0].arn : null

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window

  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  tags = var.tags
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-subnet-group"
    }
  )
}

resource "aws_security_group" "rds" {
  name        = "${var.name}-rds-sg"
  description = "Security group for RDS instance ${var.name}"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-rds-sg"
    }
  )
}

resource "aws_kms_key" "rds" {
  count = var.storage_encrypted ? 1 : 0

  description             = "KMS key for RDS encryption - ${var.name}"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = var.tags
}
