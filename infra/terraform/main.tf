locals {

  apis = toset(["run.googleapis.com", "firestore.googleapis.com", "identitytoolkit.googleapis.com", "firebase.googleapis.com", "iam.googleapis.com", "iamcredentials.googleapis.com", "cloudtasks.googleapis.com", "cloudscheduler.googleapis.com", "aiplatform.googleapis.com", "artifactregistry.googleapis.com", "secretmanager.googleapis.com", "monitoring.googleapis.com", "logging.googleapis.com", "cloudbuild.googleapis.com", "cloudtrace.googleapis.com"])
  services = {
    gateway = {
      min = var.gateway_min_instances, max = 3, concurrency = 80, cpu = "1", memory = "1Gi", timeout = "3600s"
      }, api = {
      min = 0, max = 3, concurrency = 80, cpu = "1", memory = "512Mi", timeout = "300s"
      }, builder = {
      min = 0, max = 3, concurrency = 4, cpu = "2", memory = "2Gi", timeout = "300s"
    }

  }


}

resource "google_project_service" "apis" {
  for_each           = local.apis
  service            = each.value
  disable_on_destroy = false

}

resource "google_artifact_registry_repository" "images" {

  location      = "us-central1"
  repository_id = "just-imagine"
  format        = "DOCKER"
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "604800s"
    }
  }
  depends_on = [google_project_service.apis]

}

resource "google_firestore_database" "default" {

  name            = "(default)"
  location_id     = var.firestore_location
  type            = "FIRESTORE_NATIVE"
  deletion_policy = "PREVENT_DESTROY"
  depends_on      = [google_project_service.apis]

}

resource "google_storage_bucket" "assets" {

  name                        = var.asset_bucket
  location                    = "US-CENTRAL1"
  uniform_bucket_level_access = true
  force_destroy               = false
  cors {
    origin          = [var.web_url]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600

  }


}

resource "google_storage_bucket_iam_member" "public_assets" {

  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"

}

resource "google_service_account" "service" {
  for_each   = toset(["gateway", "api", "builder", "tasks"])
  account_id = "imagine-${each.key}"

}

resource "google_project_iam_member" "firestore" {
  for_each = toset(["gateway", "api", "builder"])
  project  = var.project_id
  role     = "roles/datastore.user"
  member   = "serviceAccount:${google_service_account.service[each.key].email}"

}

resource "google_project_iam_member" "vertex" {
  for_each = toset(["gateway", "api", "builder"])
  project  = var.project_id
  role     = "roles/aiplatform.user"
  member   = "serviceAccount:${google_service_account.service[each.key].email}"

}

resource "google_project_iam_member" "auth" {
  for_each = toset(["gateway", "api"])
  project  = var.project_id
  role     = each.key == "api" ? "roles/firebaseauth.admin" : "roles/firebaseauth.viewer"
  member   = "serviceAccount:${google_service_account.service[each.key].email}"

}

# Firebase Admin uses IAM signBlob for student custom tokens under Cloud Run ADC.
# Grant the API identity permission to sign only as itself, never project-wide.
resource "google_service_account_iam_member" "api_custom_token_signer" {
  service_account_id = google_service_account.service["api"].name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.service["api"].email}"
  depends_on         = [google_project_service.apis]
}

resource "google_project_iam_member" "enqueue" {
  for_each = toset(["gateway", "api"])
  project  = var.project_id
  role     = "roles/cloudtasks.enqueuer"
  member   = "serviceAccount:${google_service_account.service[each.key].email}"

}

resource "google_service_account_iam_member" "act_as_tasks" {
  for_each           = toset(["gateway", "api"])
  service_account_id = google_service_account.service["tasks"].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.service[each.key].email}"

}

resource "google_storage_bucket_iam_member" "builder_assets" {

  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.service["builder"].email}"

}

resource "google_secret_manager_secret" "stripe" {
  for_each  = toset(["stripe-secret-key", "stripe-webhook-secret"])
  secret_id = each.key
  replication {
    auto {

    }

  }

  depends_on = [google_project_service.apis]

}

resource "google_secret_manager_secret_iam_member" "api_secrets" {
  for_each  = google_secret_manager_secret.stripe
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.service["api"].email}"

}

resource "google_cloud_tasks_queue" "queue" {
  for_each = toset(["world-builds", "deletions"])
  name     = each.key
  location = "us-central1"
  rate_limits {
    max_dispatches_per_second = 10
    max_concurrent_dispatches = 20

  }

  retry_config {
    max_attempts       = 100
    max_retry_duration = "86400s"
    min_backoff        = "5s"
    max_backoff        = "300s"
    max_doublings      = 5

  }

  depends_on = [google_project_service.apis]

}

# Predictable v2 URLs avoid a dependency cycle between service environment variables.
data "google_project" "current" {

}

locals {
  urls = {
    for name in keys(local.services) : name => "https://imagine-${name}-${data.google_project.current.number}.us-central1.run.app"
  }

}

resource "google_cloud_run_v2_service" "service" {
  for_each            = local.services
  name                = "imagine-${each.key}"
  location            = "us-central1"
  deletion_protection = true
  ingress             = "INGRESS_TRAFFIC_ALL"
  template {

    service_account                  = google_service_account.service[each.key].email
    timeout                          = each.value.timeout
    max_instance_request_concurrency = each.value.concurrency
    session_affinity                 = each.key == "gateway"
    scaling {
      min_instance_count = each.value.min
      max_instance_count = each.value.max

    }

    containers {

      image   = var.image
      command = ["node"]
      args    = ["services/${each.key}/dist/main.js"]
      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu = each.value.cpu, memory = each.value.memory
        }

        cpu_idle          = each.value.min == 0
        startup_cpu_boost = true

      }

      dynamic "env" {
        for_each = merge(var.models, {
          OTEL_ENABLED = "1", GOOGLE_CLOUD_PROJECT = var.project_id, WEB_URL = var.web_url, BUILDER_URL = local.urls.builder, BUILDER_AUDIENCE = local.urls.builder, API_AUDIENCE = local.urls.api, TASK_SERVICE_ACCOUNT = google_service_account.service["tasks"].email, ASSET_BUCKET = var.asset_bucket, ASSET_BASE_URL = var.asset_domain == "" ? "https://storage.googleapis.com/${var.asset_bucket}" : "https://${var.asset_domain}", STRIPE_PRICE_ID = var.stripe_price_id
          }, each.key == "api" ? {
          COMPANION_VERTEX = "1",
          SUBSCRIPTIONS_WITHOUT_PAYMENT = var.subscriptions_without_payment && !var.enable_billing ? "1" : "0",
          # The operator System page probes these; the builder answers 403 (private) and the gateway 426, both "up".
          ADMIN_HEALTH_TARGETS = "builder=${local.urls.builder}/health,gateway=${local.urls.gateway}/"
          } : {}
        )
        content {
          name  = env.key
          value = env.value

        }


      }

      dynamic "env" {
        for_each = each.key == "api" && var.enable_billing ? {
          STRIPE_SECRET_KEY = "stripe-secret-key", STRIPE_WEBHOOK_SECRET = "stripe-webhook-secret"
          } : {

        }

        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"

            }

          }


        }


      }

      startup_probe {
        tcp_socket {
          port = 8080
        }

        initial_delay_seconds = 5
        period_seconds        = 5

      }


    }


  }

  depends_on = [google_project_service.apis, google_project_iam_member.firestore, google_project_iam_member.vertex, google_secret_manager_secret_iam_member.api_secrets, google_service_account_iam_member.api_custom_token_signer]

}

resource "google_cloud_run_v2_service_iam_member" "public" {
  for_each = toset(["gateway", "api"])
  name     = google_cloud_run_v2_service.service[each.key].name
  location = "us-central1"
  role     = "roles/run.invoker"
  member   = "allUsers"

}

resource "google_cloud_run_v2_service_iam_member" "builder_tasks" {

  name     = google_cloud_run_v2_service.service["builder"].name
  location = "us-central1"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.service["tasks"].email}"

}

resource "google_cloud_scheduler_job" "deletion_retry" {

  name     = "imagine-retry-deletions"
  region   = "us-central1"
  schedule = "*/5 * * * *"
  http_target {
    uri         = "${local.urls.api}/internal/deletions"
    http_method = "POST"
    oidc_token {
      service_account_email = google_service_account.service["tasks"].email
      audience              = local.urls.api

    }


  }

  depends_on = [google_cloud_run_v2_service.service]

}

output "service_urls" {
  value = local.urls
}

output "assets_url" {
  value = "https://storage.googleapis.com/${var.asset_bucket}"
}

