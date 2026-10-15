variable "asset_domain" {
  type        = string
  default     = ""
  description = "Optional DNS hostname for HTTPS Cloud CDN; point its A record at assets_ip."
}
resource "google_project_service" "compute" {
  count              = var.asset_domain == "" ? 0 : 1
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}
resource "google_compute_backend_bucket" "assets" {
  count       = var.asset_domain == "" ? 0 : 1
  name        = "imagine-assets"
  bucket_name = google_storage_bucket.assets.name
  enable_cdn  = true
  cdn_policy {
    cache_mode  = "CACHE_ALL_STATIC"
    default_ttl = 86400
    max_ttl     = 31536000
    client_ttl  = 86400
  }
  depends_on = [google_project_service.compute]
}
resource "google_compute_global_address" "assets" {
  count      = var.asset_domain == "" ? 0 : 1
  name       = "imagine-assets"
  depends_on = [google_project_service.compute]
}
resource "google_compute_managed_ssl_certificate" "assets" {
  count = var.asset_domain == "" ? 0 : 1
  name  = "imagine-assets"
  managed {
    domains = [var.asset_domain]
  }
  depends_on = [google_project_service.compute]
}
resource "google_compute_url_map" "assets" {
  count           = var.asset_domain == "" ? 0 : 1
  name            = "imagine-assets"
  default_service = google_compute_backend_bucket.assets[0].id
}
resource "google_compute_target_https_proxy" "assets" {
  count            = var.asset_domain == "" ? 0 : 1
  name             = "imagine-assets"
  url_map          = google_compute_url_map.assets[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.assets[0].id]
}
resource "google_compute_global_forwarding_rule" "assets" {
  count      = var.asset_domain == "" ? 0 : 1
  name       = "imagine-assets"
  target     = google_compute_target_https_proxy.assets[0].id
  port_range = "443"
  ip_address = google_compute_global_address.assets[0].address
}
output "assets_ip" {
  value = var.asset_domain == "" ? null : google_compute_global_address.assets[0].address
}
