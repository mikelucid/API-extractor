terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "app_name" {
  default = "rootagentv2"
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH"
  default     = "0.0.0.0/0"
}

resource "aws_security_group" "rootagentv2" {
  name        = "${var.app_name}-sg"
  description = "Security group for ${var.app_name}"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "App port"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-sg"
  }
}

output "security_group_id" {
  value = aws_security_group.rootagentv2.id
}
