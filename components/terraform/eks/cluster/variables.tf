variable "name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version to use for the EKS cluster"
  default     = "1.28"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the cluster will be created"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for the EKS cluster"
}

variable "cluster_endpoint_private_access" {
  type        = bool
  description = "Enable private API server endpoint"
  default     = true
}

variable "cluster_endpoint_public_access" {
  type        = bool
  description = "Enable public API server endpoint"
  default     = true
}

variable "public_access_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks that can access the public API server endpoint"
  default     = ["0.0.0.0/0"]
}

variable "enabled_cluster_log_types" {
  type        = list(string)
  description = "List of control plane logging types to enable"
  default     = ["api", "audit", "authenticator"]
}

variable "cluster_encryption_config_enabled" {
  type        = bool
  description = "Enable encryption of Kubernetes secrets"
  default     = true
}

variable "node_groups" {
  type = map(object({
    desired_size   = number
    min_size       = number
    max_size       = number
    instance_types = list(string)
    capacity_type  = optional(string, "ON_DEMAND")
    disk_size      = optional(number, 50)
  }))
  description = "Map of node group configurations"
  default     = {}
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
