locals {

  event_metrics = {

    builder_failures = "jsonPayload.event=\"builder_result\" AND jsonPayload.success=false"
    builder_results  = "jsonPayload.event=\"builder_result\""
    moderation_hits  = "jsonPayload.event=\"moderation_hit\""
    kill_switch      = "jsonPayload.event=\"kill_switch_on\""
    asset_cache_hits = "jsonPayload.event=\"asset_cache\" AND jsonPayload.cached=true"

  }


}

resource "google_logging_metric" "events" {

  for_each = local.event_metrics
  name     = "imagine_${each.key}"
  filter   = "resource.type=\"cloud_run_revision\" AND ${each.value}"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"

  }


}

resource "google_logging_metric" "first_audio" {

  name            = "imagine_first_audio_ms"
  filter          = "resource.type=\"cloud_run_revision\" AND jsonPayload.event=\"first_audio\""
  value_extractor = "EXTRACT(jsonPayload.durationMs)"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "DISTRIBUTION"
    unit        = "ms"

  }

  bucket_options {
    explicit_buckets {
      bounds = [100, 250, 500, 750, 1000, 1200, 1500, 2000, 3000, 5000, 10000]
    }

  }


}

resource "google_monitoring_alert_policy" "audio_latency" {

  display_name          = "Just Imagine first audio p95 above 3 seconds"
  combiner              = "OR"
  notification_channels = var.notification_channels
  conditions {
    display_name = "p95 above 3000 ms for 10 minutes"
    condition_threshold {

      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/${google_logging_metric.first_audio.name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3000
      duration        = "600s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"

      }


    }


  }


}

resource "google_monitoring_alert_policy" "builder_failures" {

  display_name          = "Just Imagine builder failure rate above 10 percent"
  combiner              = "OR"
  notification_channels = var.notification_channels
  conditions {
    display_name = "Failure ratio above 0.1"
    condition_threshold {

      filter             = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/${google_logging_metric.events["builder_failures"].name}\""
      denominator_filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/${google_logging_metric.events["builder_results"].name}\""
      comparison         = "COMPARISON_GT"
      threshold_value    = 0.1
      duration           = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"

      }

      denominator_aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"

      }


    }


  }


}

resource "google_monitoring_alert_policy" "kill_switch" {

  display_name          = "Just Imagine kill switch activated"
  combiner              = "OR"
  notification_channels = var.notification_channels
  conditions {
    display_name = "Kill switch enabled"
    condition_matched_log {
      filter = "resource.type=\"cloud_run_revision\" AND jsonPayload.event=\"kill_switch_on\""
    }


  }

  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }

    auto_close = "1800s"

  }


}

resource "google_monitoring_alert_policy" "gateway_errors" {

  display_name          = "Just Imagine gateway HTTP 5xx above two percent"
  combiner              = "OR"
  notification_channels = var.notification_channels
  conditions {
    display_name = "5xx ratio above 0.02"
    condition_threshold {

      filter             = "resource.type=\"cloud_run_revision\" AND resource.label.service_name=\"imagine-gateway\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""
      denominator_filter = "resource.type=\"cloud_run_revision\" AND resource.label.service_name=\"imagine-gateway\" AND metric.type=\"run.googleapis.com/request_count\""
      comparison         = "COMPARISON_GT"
      threshold_value    = 0.02
      duration           = "300s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"

      }

      denominator_aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"

      }


    }


  }


}

resource "google_monitoring_uptime_check_config" "app" {

  for_each = {
    web = var.web_url, api = local.urls.api
  }

  display_name = "Just Imagine ${each.key}"
  timeout      = "10s"
  period       = "60s"
  http_check {
    path         = each.key == "api" ? "/health" : "/"
    port         = 443
    use_ssl      = true
    validate_ssl = true

  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id, host = split("/", trimprefix(each.value, "https://"))[0]
    }


  }


}

resource "google_monitoring_dashboard" "operations" {

  dashboard_json = jsonencode({
    displayName = "Just Imagine operations", gridLayout = {
      columns = 2, widgets = [
        {
          title = "First audio latency", xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/${google_logging_metric.first_audio.name}\"", aggregation = {
                    alignmentPeriod = "60s", perSeriesAligner = "ALIGN_PERCENTILE_95"
                  }

                }

              }, plotType = "LINE"
              }
            ]
          }

        },
        {
          title = "Builder failures", xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/${google_logging_metric.events["builder_failures"].name}\"", aggregation = {
                    alignmentPeriod = "60s", perSeriesAligner = "ALIGN_RATE"
                  }

                }

              }, plotType = "LINE"
              }
            ]
          }

        }

      ]
    }

  })

}

resource "google_project_iam_member" "traces" {

  for_each = toset(["gateway", "api", "builder"])
  project  = var.project_id
  role     = "roles/cloudtrace.agent"
  member   = "serviceAccount:${google_service_account.service[each.key].email}"

}

variable "notification_channels" {
  type        = list(string)
  default     = []
  description = "Existing Monitoring channel IDs receiving alerts; configure in staging/prod tfvars."

}

