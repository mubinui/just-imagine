# Next.js web app on Cloud Run (instead of App Hosting) so it scales to zero without a GitHub connection.
resource "google_service_account" "web" {
  account_id = "imagine-web"
}

resource "google_project_iam_member" "web_auth" {
  project = var.project_id
  role    = "roles/firebaseauth.admin"
  member  = "serviceAccount:${google_service_account.web.email}"
}

# /api/session reads and writes family records (guidebook step 8c).
resource "google_project_iam_member" "web_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_cloud_run_v2_service" "web" {
  count               = var.web_image == "" ? 0 : 1
  name                = "imagine-web"
  location            = "us-central1"
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"
  template {
    service_account                  = google_service_account.web.email
    max_instance_request_concurrency = 80
    scaling {
      min_instance_count = var.web_min_instances
      max_instance_count = 3
    }
    containers {
      image = var.web_image
      ports {
        container_port = 8080
      }
      resources {
        limits            = { cpu = "1", memory = "1Gi" }
        cpu_idle          = true
        startup_cpu_boost = true
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "WEB_URL"
        value = var.web_url
      }
    }
  }
  depends_on = [google_project_iam_member.web_auth, google_project_iam_member.web_firestore]
}

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  count    = var.web_image == "" ? 0 : 1
  name     = google_cloud_run_v2_service.web[0].name
  location = "us-central1"
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "web_url" {
  value = "https://imagine-web-${data.google_project.current.number}.us-central1.run.app"
}
