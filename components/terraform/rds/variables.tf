variable "name" {
  type        = string
  description = "Name of the RDS instance"
}

variable "engine" {
  type        = string
  description = "Database engine (postgres, mysql, etc.)"
}

variable "engine_version" {
  type        = string
  description = "Database engine version"
}

variable "instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage in GB"
  default     = 100
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum allocated storage for autoscaling"
  default     = null
}

variable "storage_type" {
  type        = string
  description = "Storage type (gp2, gp3, io1)"
  default     = "gp3"
}

variable "storage_encrypted" {
  type        = bool
  description = "Enable storage encryption"
  default     = true
}

variable "database_name" {
  type        = string
  description = "Name of the database to create"
  default     = null
}

variable "master_username" {
  type        = string
  description = "Master username for the database"
  default     = "admin"
}

variable "master_password" {
  type        = string
  description = "Master password for the database"
  sensitive   = true
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where RDS will be created"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for the DB subnet group"
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to connect to the database"
  default     = []
}

variable "port" {
  type        = number
  description = "Database port"
  default     = 5432
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment"
  default     = false
}

variable "backup_retention_period" {
  type        = number
  description = "Backup retention period in days"
  default     = 7
}

variable "backup_window" {
  type        = string
  description = "Preferred backup window"
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window"
  default     = "mon:04:00-mon:05:00"
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection"
  default     = true
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on deletion"
  default     = false
}

variable "enabled_cloudwatch_logs_exports" {
  type        = list(string)
  description = "List of log types to export to CloudWatch"
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
