terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Commented out for initial setup - using local state
  # backend "gcs" {
  #   bucket = "birthday-reminder-terraform-state"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project         = var.project_id
  region          = var.region
  billing_project = var.project_id
  user_project_override = true
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "pubsub.googleapis.com",
    "cloudscheduler.googleapis.com",
    "iam.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${var.app_name}-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.required_apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.app_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Private IP range for Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.app_name}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

# Private VPC connection for Cloud SQL
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
  depends_on              = [google_project_service.required_apis]
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "${var.app_name}-db"
  database_version = "POSTGRES_15"
  region           = var.region
  depends_on       = [google_project_service.required_apis, google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = 10
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.environment == "production"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "db_user" {
  name     = var.database_user
  instance = google_sql_database_instance.postgres.name
  password = var.database_password
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "${var.app_name}-docker"
  description   = "Docker repository for ${var.app_name}"
  format        = "DOCKER"
  depends_on    = [google_project_service.required_apis]
}

# Pub/Sub Topic for push notifications
resource "google_pubsub_topic" "notifications" {
  name       = "${var.app_name}-notifications"
  depends_on = [google_project_service.required_apis]
}

resource "google_pubsub_subscription" "notifications_sub" {
  name  = "${var.app_name}-notifications-sub"
  topic = google_pubsub_topic.notifications.name

  ack_deadline_seconds = 20

  push_config {
    push_endpoint = "${google_cloud_run_service.api.status[0].url}/api/notifications/push"
  }
}

# Service Account for Cloud Run
resource "google_service_account" "api_service_account" {
  account_id   = "${var.app_name}-api-sa"
  display_name = "Service Account for ${var.app_name} API"
  depends_on   = [google_project_service.required_apis]
}

resource "google_project_iam_member" "api_sa_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_service_account.email}"
}

resource "google_project_iam_member" "api_sa_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api_service_account.email}"
}

# VPC Connector for Cloud Run to Cloud SQL
resource "google_vpc_access_connector" "connector" {
  name          = "birthdayreminder-conn"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  depends_on    = [google_project_service.required_apis]
}

# Cloud Run Service
resource "google_cloud_run_service" "api" {
  name     = "${var.app_name}-api"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.api_service_account.email

      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/api:latest"

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "DATABASE_URL"
          value = "postgresql://${google_sql_user.db_user.name}:${urlencode(var.database_password)}@/${google_sql_database.database.name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
        }

        env {
          name  = "JWT_SECRET"
          value = var.jwt_secret
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "GCP_REGION"
          value = var.region
        }

        env {
          name  = "PUBSUB_TOPIC"
          value = google_pubsub_topic.notifications.name
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"      = "10"
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.postgres.connection_name
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.id
        "run.googleapis.com/vpc-access-egress"  = "private-ranges-only"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.required_apis,
    google_sql_database_instance.postgres,
  ]
}

# Allow public access to Cloud Run service
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Scheduler for daily birthday check
resource "google_cloud_scheduler_job" "birthday_check" {
  name             = "${var.app_name}-birthday-check"
  description      = "Daily birthday notification check"
  schedule         = "0 9 * * *"
  time_zone        = "America/New_York"
  attempt_deadline = "320s"
  region           = var.region
  depends_on       = [google_project_service.required_apis]

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_service.api.status[0].url}/api/notifications/check"

    oidc_token {
      service_account_email = google_service_account.api_service_account.email
    }
  }
}
