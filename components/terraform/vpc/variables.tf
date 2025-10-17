variable "name" {
  type        = string
  description = "Name of the VPC"
}

variable "cidr_block" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "region" {
  type        = string
  description = "AWS region"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zone suffixes (e.g., ['a', 'b', 'c'])"
  default     = ["a", "b", "c"]
}

variable "nat_gateway_enabled" {
  type        = bool
  description = "Enable NAT Gateway for private subnets"
  default     = true
}

variable "nat_instance_enabled" {
  type        = bool
  description = "Enable NAT Instance instead of NAT Gateway"
  default     = false
}

variable "dns_hostnames_enabled" {
  type        = bool
  description = "Enable DNS hostnames in the VPC"
  default     = true
}

variable "dns_support_enabled" {
  type        = bool
  description = "Enable DNS support in the VPC"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
