output "api_url" {
  description = "URL of the deployed API"
  value       = google_cloud_run_service.api.status[0].url
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "artifact_registry_url" {
  description = "Artifact Registry URL for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "pubsub_topic" {
  description = "Pub/Sub topic for notifications"
  value       = google_pubsub_topic.notifications.id
}
