terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# VPC Component
# This component creates a VPC with public and private subnets across multiple AZs

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = var.dns_hostnames_enabled
  enable_dns_support   = var.dns_support_enabled

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 4, count.index)
  availability_zone = "${var.region}${var.availability_zones[count.index]}"

  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-public-${var.availability_zones[count.index]}"
      Type = "public"
    }
  )
}

resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 4, count.index + length(var.availability_zones))
  availability_zone = "${var.region}${var.availability_zones[count.index]}"

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-private-${var.availability_zones[count.index]}"
      Type = "private"
    }
  )
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-igw"
    }
  )
}

resource "aws_nat_gateway" "main" {
  count = var.nat_gateway_enabled ? length(var.availability_zones) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-nat-${var.availability_zones[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

resource "aws_eip" "nat" {
  count = var.nat_gateway_enabled ? length(var.availability_zones) : 0

  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-nat-eip-${var.availability_zones[count.index]}"
    }
  )
}
