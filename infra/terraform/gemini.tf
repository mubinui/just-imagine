# Optional Gemini API key (AI Studio). When set, the services call Gemini with this key instead of
# Vertex AI. The secret value is added outside Terraform:
#   printf '%s' "$KEY" | gcloud secrets versions add gemini-api-key --data-file=-
variable "use_gemini_api_key" {
  type        = bool
  default     = false
  description = "Pass Secret Manager gemini-api-key to all services as GEMINI_API_KEY."
}

data "google_secret_manager_secret" "gemini" {
  count     = var.use_gemini_api_key ? 1 : 0
  secret_id = "gemini-api-key"
}

resource "google_secret_manager_secret_iam_member" "gemini" {
  for_each  = var.use_gemini_api_key ? toset(["gateway", "api", "builder"]) : toset([])
  secret_id = data.google_secret_manager_secret.gemini[0].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.service[each.key].email}"
}
